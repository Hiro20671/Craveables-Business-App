import os
from decimal import Decimal
import datetime
import openpyxl
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone

from apps.accounts.models import UserProfile, UserRole
from apps.suppliers.models import Supplier
from apps.inventory.models import Ingredient, StockTransaction, TransactionType, MeasurementUnit
from apps.products.models import Category, Product, ProductVariant
from apps.costing.models import PackagingItem, Recipe, RecipeIngredient, RecipePackaging
from apps.sales.models import SaleOrder, SaleItem, PaymentMethod
from apps.expenses.models import Expense, ExpenseCategory
from apps.settings_app.models import BusinessSettings

class Command(BaseCommand):
    help = 'Imports initial business data from CRAVEABLES-PRICING-AND-COSTING.xlsx and initializes users'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting CRAVEABLES Data Migration..."))

        # 1. Initialize Users
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@craveables.ph',
                'first_name': 'Craveables',
                'last_name': 'Admin',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            admin_user.profile.role = UserRole.ADMIN
            admin_user.profile.save()
            self.stdout.write(self.style.SUCCESS("Created admin user (admin / admin123)"))

        staff_user, created = User.objects.get_or_create(
            username='staff',
            defaults={
                'email': 'baker@craveables.ph',
                'first_name': 'Bakery',
                'last_name': 'Staff',
                'is_staff': False,
                'is_superuser': False
            }
        )
        if created:
            staff_user.set_password('staff123')
            staff_user.save()
            staff_user.profile.role = UserRole.STAFF
            staff_user.profile.save()
            self.stdout.write(self.style.SUCCESS("Created staff user (staff / staff123)"))

        # 2. Business Settings
        settings_obj, _ = BusinessSettings.objects.get_or_create(
            id=1,
            defaults={
                'business_name': 'CRAVEABLES',
                'tagline': 'Freshly Baked Treats & Artisanal Delights',
                'currency_symbol': '₱',
                'currency_code': 'PHP',
                'default_reorder_level': Decimal('200.00'),
                'default_minimum_stock': Decimal('100.00'),
                'default_target_margin': Decimal('30.00'),
                'contact_email': 'craveablesbakery@gmail.com',
                'logo_path': '/logo.png'
            }
        )

        # Path to workbook
        excel_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))), 'CRAVEABLES-PRICING-AND-COSTING.xlsx')
        if not os.path.exists(excel_path):
            excel_path = 'C:\\Craveables Business App\\CRAVEABLES-PRICING-AND-COSTING.xlsx'

        self.stdout.write(f"Reading Excel workbook from: {excel_path}")
        wb = openpyxl.load_workbook(excel_path, data_only=True)

        # 3. Create Suppliers
        supplier_names = ['Baking Store', 'SM', 'Online', 'Market']
        suppliers = {}
        for s_name in supplier_names:
            sup, _ = Supplier.objects.get_or_create(
                name=s_name,
                defaults={
                    'contact_person': f"{s_name} Representative",
                    'phone': '0917-000-0000',
                    'email': f"contact@{s_name.lower().replace(' ', '')}.com",
                    'address': 'Metro Manila, Philippines'
                }
            )
            suppliers[s_name] = sup
        self.stdout.write(self.style.SUCCESS(f"Initialized {len(suppliers)} suppliers."))

        # 4. Import Ingredients
        sheet_ing = wb['Ingredients']
        imported_ingredients = {}
        # Rows 5 to 22 in CRAVEABLES-PRICING-AND-COSTING.xlsx
        for r in range(5, 23):
            name = sheet_ing.cell(r, 1).value
            if not name:
                continue
            name = str(name).strip()
            sup_name = str(sheet_ing.cell(r, 2).value or '').strip()
            p_date_val = sheet_ing.cell(r, 3).value
            p_cost = Decimal(str(sheet_ing.cell(r, 4).value or 0))
            pack_size = Decimal(str(sheet_ing.cell(r, 5).value or 1000))
            unit_val = sheet_ing.cell(r, 6).value
            cost_per_unit = Decimal(str(sheet_ing.cell(r, 7).value or 0))
            stock = Decimal(str(sheet_ing.cell(r, 8).value or 0))

            unit = 'g'
            if name.lower() == 'eggs':
                unit = 'pcs'
            elif 'extract' in name.lower() or 'oil' in name.lower() or 'milk' in name.lower():
                unit = 'ml'

            p_date = None
            if isinstance(p_date_val, datetime.date):
                p_date = p_date_val
            elif isinstance(p_date_val, datetime.datetime):
                p_date = p_date_val.date()
            else:
                p_date = datetime.date(2026, 4, 11)

            # Reorder level customizable
            reorder = Decimal('200.00')
            if unit == 'pcs':
                reorder = Decimal('6.00')
            elif name.lower() in ['cinnamon', 'salt', 'baking soda']:
                reorder = Decimal('30.00')

            supplier_obj = suppliers.get(sup_name)

            ing, created = Ingredient.objects.get_or_create(
                name=name,
                defaults={
                    'supplier': supplier_obj,
                    'supplier_name_raw': sup_name,
                    'purchase_date': p_date,
                    'purchase_cost': p_cost,
                    'package_size': pack_size,
                    'unit': unit,
                    'cost_per_unit': cost_per_unit if cost_per_unit > 0 else (round(p_cost / pack_size, 4) if pack_size > 0 else Decimal('0')),
                    'current_stock': stock,
                    'minimum_stock_level': reorder / Decimal('2'),
                    'reorder_level': reorder
                }
            )
            imported_ingredients[name.lower()] = ing

            if created:
                StockTransaction.objects.create(
                    ingredient=ing,
                    transaction_type=TransactionType.INITIAL,
                    quantity_change=stock,
                    previous_stock=Decimal('0.00'),
                    new_stock=stock,
                    reason='Initial stock imported from Excel workbook',
                    created_by=admin_user
                )

        # Also add Food color if missing
        if 'food color' not in imported_ingredients:
            fc, created = Ingredient.objects.get_or_create(
                name='Food color',
                defaults={
                    'supplier': suppliers.get('Baking Store'),
                    'supplier_name_raw': 'Baking Store',
                    'purchase_date': datetime.date(2026, 4, 11),
                    'purchase_cost': Decimal('35.00'),
                    'package_size': Decimal('100.00'),
                    'unit': 'ml',
                    'cost_per_unit': Decimal('0.3500'),
                    'current_stock': Decimal('100.00'),
                    'minimum_stock_level': Decimal('20.00'),
                    'reorder_level': Decimal('30.00')
                }
            )
            imported_ingredients['food color'] = fc

        self.stdout.write(self.style.SUCCESS(f"Imported {len(imported_ingredients)} ingredients into inventory."))

        # 5. Import Packaging Items
        sheet_costing = wb['Product Costing']
        packaging_items = {}
        for r in range(7, 16):
            p_name = sheet_costing.cell(r, 9).value
            if not p_name:
                continue
            p_name = str(p_name).strip()
            p_cost = Decimal(str(sheet_costing.cell(r, 10).value or 0))
            p_qty = Decimal(str(sheet_costing.cell(r, 11).value or 1))
            p_need = Decimal(str(sheet_costing.cell(r, 13).value or 1))

            pkg, _ = PackagingItem.objects.get_or_create(
                name=p_name,
                defaults={
                    'cost': p_cost,
                    'quantity': p_qty,
                    'default_needed_per_batch': p_need
                }
            )
            packaging_items[p_name.lower()] = pkg
        self.stdout.write(self.style.SUCCESS(f"Imported {len(packaging_items)} packaging items."))

        # 6. Create Categories
        cat_cakes, _ = Category.objects.get_or_create(name='Cakes', defaults={'description': 'Freshly baked artisanal cakes'})
        cat_brownies, _ = Category.objects.get_or_create(name='Brownies', defaults={'description': 'Fudgy and rich chocolate brownies'})
        cat_cookies, _ = Category.objects.get_or_create(name='Cookies', defaults={'description': 'Gourmet handcrafted cookies'})

        # 7. Products and Recipes definition
        products_def = [
            {
                'name': 'Banana Cake',
                'category': cat_cakes,
                'description': 'Moist, flavorful banana cake made with real bananas and premium toppings.',
                'variants': [
                    {
                        'name': 'Small (120g)',
                        'selling_price': Decimal('60.00'),
                        'batch_yield': 6,
                        'batch_size_desc': '120 grams',
                        'packaging_cost': Decimal('10.18'),
                        'electricity_cost': Decimal('70.00'),
                        'labor_cost': Decimal('50.00'),
                        'ingredients': [
                            ('Flour', 360, 'g'),
                            ('Baking Soda', 5, 'g'),
                            ('White Sugar', 120, 'g'),
                            ('Brown Sugar', 120, 'g'),
                            ('Salt', 2.5, 'g'),
                            ('Cinnamon', 5, 'g'),
                            ('Chocolate Chip', 60, 'g'),
                            ('Almond Slice', 10, 'g'),
                            ('Vegetable Oil', 120, 'ml'),
                            ('Vanilla Extract', 10, 'ml'),
                            ('Milk', 120, 'ml'),
                            ('Eggs', 1, 'pcs'),
                        ]
                    },
                    {
                        'name': 'Big (400g)',
                        'selling_price': Decimal('135.00'),
                        'batch_yield': 3,
                        'batch_size_desc': '400 gms',
                        'packaging_cost': Decimal('13.08'),
                        'electricity_cost': Decimal('70.00'),
                        'labor_cost': Decimal('50.00'),
                        'ingredients': [
                            ('Flour', 360, 'g'),
                            ('Baking Soda', 5, 'g'),
                            ('White Sugar', 120, 'g'),
                            ('Brown Sugar', 120, 'g'),
                            ('Salt', 2.5, 'g'),
                            ('Cinnamon', 5, 'g'),
                            ('Chocolate Chip', 60, 'g'),
                            ('Almond Slice', 10, 'g'),
                            ('Vegetable Oil', 120, 'ml'),
                            ('Vanilla Extract', 10, 'ml'),
                            ('Milk', 120, 'ml'),
                            ('Eggs', 1, 'pcs'),
                        ]
                    }
                ]
            },
            {
                'name': 'Classic Brownies',
                'category': cat_brownies,
                'description': 'Rich, decadent chocolate brownies with a glossy crackly top and fudgy center.',
                'variants': [
                    {
                        'name': 'Box of 6',
                        'selling_price': Decimal('220.00'),
                        'batch_yield': 2,
                        'batch_size_desc': 'Box of 6 pieces',
                        'packaging_cost': Decimal('14.014'),
                        'electricity_cost': Decimal('70.00'),
                        'labor_cost': Decimal('50.00'),
                        'ingredients': [
                            ('Flour', 75, 'g'),
                            ('Cocoa', 35, 'g'),
                            ('White Sugar', 100, 'g'),
                            ('Brown Sugar', 100, 'g'),
                            ('Salt', 2.5, 'g'),
                            ('Dark Compound', 200, 'g'),
                            ('Butter', 100, 'g'),
                            ('Eggs', 3, 'pcs'),
                            ('Vanilla Extract', 10, 'ml'),
                        ]
                    },
                    {
                        'name': 'Box of 3',
                        'selling_price': Decimal('110.00'),
                        'batch_yield': 4,
                        'batch_size_desc': 'Box of 3 pieces',
                        'packaging_cost': Decimal('6.214'),
                        'electricity_cost': Decimal('70.00'),
                        'labor_cost': Decimal('50.00'),
                        'ingredients': [
                            ('Flour', 75, 'g'),
                            ('Cocoa', 35, 'g'),
                            ('White Sugar', 100, 'g'),
                            ('Brown Sugar', 100, 'g'),
                            ('Salt', 2.5, 'g'),
                            ('Dark Compound', 200, 'g'),
                            ('Butter', 100, 'g'),
                            ('Eggs', 3, 'pcs'),
                            ('Vanilla Extract', 10, 'ml'),
                        ]
                    }
                ]
            },
            {
                'name': 'Cookies',
                'category': cat_cookies,
                'description': 'Signature gourmet baked cookies with rich Belgian chocolate and buttery aroma.',
                'variants': [
                    {
                        'name': 'Choco Chip Box',
                        'selling_price': Decimal('180.00'),
                        'batch_yield': 2,
                        'batch_size_desc': 'Tub / Box',
                        'packaging_cost': Decimal('3.425'),
                        'electricity_cost': Decimal('70.00'),
                        'labor_cost': Decimal('50.00'),
                        'ingredients': [
                            ('Flour', 480, 'g'),
                            ('White Sugar', 120, 'g'),
                            ('Brown Sugar', 120, 'g'),
                            ('Salt', 2.5, 'g'),
                            ('Dark Compound', 100, 'g'),
                            ('Chocolate Chip', 50, 'g'),
                            ('Butter', 100, 'g'),
                            ('Eggs', 1, 'pcs'),
                            ('Vanilla Extract', 10, 'ml'),
                        ]
                    },
                    {
                        'name': 'Triple Choco Box',
                        'selling_price': Decimal('210.00'),
                        'batch_yield': 2,
                        'batch_size_desc': 'Tub / Box',
                        'packaging_cost': Decimal('3.425'),
                        'electricity_cost': Decimal('70.00'),
                        'labor_cost': Decimal('50.00'),
                        'ingredients': [
                            ('Flour', 480, 'g'),
                            ('Cocoa', 60, 'g'),
                            ('White Sugar', 120, 'g'),
                            ('Brown Sugar', 120, 'g'),
                            ('Salt', 2.5, 'g'),
                            ('Dark Compound', 100, 'g'),
                            ('Chocolate Chip', 50, 'g'),
                            ('Butter', 100, 'g'),
                            ('Eggs', 1, 'pcs'),
                            ('Vanilla Extract', 10, 'ml'),
                        ]
                    },
                    {
                        'name': 'Triple Choco Solo (Piece)',
                        'selling_price': Decimal('35.00'),
                        'batch_yield': 13,
                        'batch_size_desc': 'Single wrapped piece',
                        'packaging_cost': Decimal('3.425'),
                        'electricity_cost': Decimal('70.00'),
                        'labor_cost': Decimal('50.00'),
                        'ingredients': [
                            ('Flour', 480, 'g'),
                            ('Cocoa', 60, 'g'),
                            ('White Sugar', 120, 'g'),
                            ('Brown Sugar', 120, 'g'),
                            ('Salt', 2.5, 'g'),
                            ('Dark Compound', 100, 'g'),
                            ('Chocolate Chip', 50, 'g'),
                            ('Butter', 100, 'g'),
                            ('Eggs', 1, 'pcs'),
                            ('Vanilla Extract', 10, 'ml'),
                            ('Food color', 5, 'ml'),
                        ]
                    }
                ]
            }
        ]

        # Helper to find ingredient loosely
        def find_ingredient(name):
            n = name.lower().strip()
            if n in imported_ingredients:
                return imported_ingredients[n]
            # fuzzy matches
            for k, v in imported_ingredients.items():
                if n in k or k in n:
                    return v
            return None

        for p_def in products_def:
            prod, _ = Product.objects.get_or_create(
                name=p_def['name'],
                defaults={
                    'category': p_def['category'],
                    'description': p_def['description'],
                    'status': 'ACTIVE'
                }
            )

            for v_def in p_def['variants']:
                variant, _ = ProductVariant.objects.get_or_create(
                    product=prod,
                    name=v_def['name'],
                    defaults={
                        'selling_price': v_def['selling_price'],
                        'batch_yield': v_def['batch_yield'],
                        'current_finished_stock': Decimal('5.00'),
                        'is_active': True
                    }
                )

                # Create Recipe
                recipe, _ = Recipe.objects.get_or_create(
                    product_variant=variant,
                    defaults={
                        'name': f"{prod.name} — {variant.name}",
                        'batch_yield': v_def['batch_yield'],
                        'batch_size_desc': v_def['batch_size_desc'],
                        'packaging_cost': v_def['packaging_cost'],
                        'electricity_cost': v_def['electricity_cost'],
                        'labor_cost': v_def['labor_cost']
                    }
                )

                # Add recipe ingredients
                for ing_name, qty, unit in v_def['ingredients']:
                    ing_obj = find_ingredient(ing_name)
                    if ing_obj:
                        RecipeIngredient.objects.get_or_create(
                            recipe=recipe,
                            ingredient=ing_obj,
                            defaults={
                                'quantity_used': Decimal(str(qty)),
                                'unit': unit
                            }
                        )

        self.stdout.write(self.style.SUCCESS("Imported all products, variants, and recipes."))

        # 8. Seed Initial Realistic Sales & Expenses
        today = timezone.now().date()
        if not SaleOrder.objects.exists():
            v_bc_small = ProductVariant.objects.get(name='Small (120g)', product__name='Banana Cake')
            v_bc_big = ProductVariant.objects.get(name='Big (400g)', product__name='Banana Cake')
            v_br_6 = ProductVariant.objects.get(name='Box of 6', product__name='Classic Brownies')
            v_ck_tc = ProductVariant.objects.get(name='Triple Choco Box', product__name='Cookies')
            v_ck_solo = ProductVariant.objects.get(name='Triple Choco Solo (Piece)', product__name='Cookies')

            # Seed sales for last 5 days
            sample_sales = [
                {
                    'receipt': 'CRV-202611-0001',
                    'date': today - datetime.timedelta(days=4),
                    'customer': 'Maria Santos',
                    'method': PaymentMethod.GCASH,
                    'items': [(v_bc_small, 4, Decimal('60.00')), (v_br_6, 2, Decimal('220.00'))]
                },
                {
                    'receipt': 'CRV-202611-0002',
                    'date': today - datetime.timedelta(days=3),
                    'customer': 'Juan Dela Cruz',
                    'method': PaymentMethod.CASH,
                    'items': [(v_ck_tc, 3, Decimal('210.00')), (v_bc_big, 1, Decimal('135.00'))]
                },
                {
                    'receipt': 'CRV-202611-0003',
                    'date': today - datetime.timedelta(days=2),
                    'customer': 'Clarissa Reyes',
                    'method': PaymentMethod.QR_PH,
                    'items': [(v_br_6, 3, Decimal('220.00')), (v_ck_solo, 10, Decimal('35.00'))]
                },
                {
                    'receipt': 'CRV-202611-0004',
                    'date': today - datetime.timedelta(days=1),
                    'customer': 'Patricia Gomez',
                    'method': PaymentMethod.GCASH,
                    'items': [(v_bc_big, 2, Decimal('135.00')), (v_ck_tc, 2, Decimal('210.00'))]
                },
                {
                    'receipt': 'CRV-202611-0005',
                    'date': today,
                    'customer': 'Walk-in Customer',
                    'method': PaymentMethod.CASH,
                    'items': [(v_bc_small, 5, Decimal('60.00')), (v_ck_solo, 6, Decimal('35.00'))]
                }
            ]

            for s in sample_sales:
                subtotal = Decimal('0.00')
                total_cogs = Decimal('0.00')
                order = SaleOrder.objects.create(
                    receipt_number=s['receipt'],
                    sale_date=s['date'],
                    customer_name=s['customer'],
                    payment_method=s['method'],
                    created_by=admin_user
                )
                for variant, qty, price in s['items']:
                    unit_cost = variant.recipe.calculated_cost_per_unit if hasattr(variant, 'recipe') else Decimal('0')
                    item_total = price * Decimal(str(qty))
                    subtotal += item_total
                    total_cogs += unit_cost * Decimal(str(qty))

                    SaleItem.objects.create(
                        sale_order=order,
                        product_variant=variant,
                        quantity=qty,
                        selling_price=price,
                        historical_unit_cost=unit_cost
                    )
                order.subtotal = subtotal
                order.total_sales = subtotal
                order.total_cogs = total_cogs
                order.gross_profit = subtotal - total_cogs
                order.save()

            self.stdout.write(self.style.SUCCESS("Seeded sample sales transactions."))

        if not Expense.objects.exists():
            sample_expenses = [
                {'date': today - datetime.timedelta(days=4), 'cat': ExpenseCategory.ELECTRICITY, 'desc': 'Meralco Electric Bill (Bakery Oven Usage)', 'amount': Decimal('1450.00'), 'method': 'GCash'},
                {'date': today - datetime.timedelta(days=3), 'cat': ExpenseCategory.PACKAGING, 'desc': 'Bulk purchase of Brownie Boxes & Cookie Wraps', 'amount': Decimal('680.00'), 'method': 'Cash'},
                {'date': today - datetime.timedelta(days=2), 'cat': ExpenseCategory.SHIPPING, 'desc': 'Lalamove Delivery to Taguig customer', 'amount': Decimal('180.00'), 'method': 'GCash'},
                {'date': today - datetime.timedelta(days=1), 'cat': ExpenseCategory.SUPPLIES, 'desc': 'Parchment paper, gloves, sanitizing alcohol', 'amount': Decimal('320.00'), 'method': 'Cash'},
                {'date': today, 'cat': ExpenseCategory.LABOR, 'desc': 'Bakery Assistant Daily Allowance', 'amount': Decimal('550.00'), 'method': 'Cash'}
            ]
            for exp in sample_expenses:
                Expense.objects.create(
                    date=exp['date'],
                    category=exp['cat'],
                    description=exp['desc'],
                    amount=exp['amount'],
                    payment_method=exp['method'],
                    created_by=admin_user
                )
            self.stdout.write(self.style.SUCCESS("Seeded sample operating expenses."))

        self.stdout.write(self.style.SUCCESS("Successfully completed CRAVEABLES business data migration!"))

