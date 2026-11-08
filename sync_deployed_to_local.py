import os
import sys
import django
import urllib.request
import json
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from apps.suppliers.models import Supplier
from apps.inventory.models import Ingredient, StockTransaction
from apps.products.models import Category, Product, ProductVariant
from apps.costing.models import PackagingItem, Recipe, RecipeIngredient, RecipePackaging
from apps.production.models import ProductionOrder, ProductionIngredientUsage, ProductionStatus
from apps.sales.models import SaleOrder, SaleItem, CustomerInquiry, InquiryStatus, CustomerReview, PaymentMethod
from apps.expenses.models import Expense
from apps.settings_app.models import BusinessSettings

BASE_URL = 'https://jeremy2005.pythonanywhere.com/api/'

def fetch_json(endpoint):
    url = BASE_URL + endpoint
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {endpoint}: {e}")
        return None

def sync_data():
    print("=== STARTING LIVE DATA SYNC FROM PYTHONANYWHERE ===")
    admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()

    # 1. Sync Suppliers
    print("Fetching suppliers...")
    suppliers_data = fetch_json('suppliers/suppliers/')
    if suppliers_data:
        for s in suppliers_data:
            Supplier.objects.update_or_create(
                id=s['id'],
                defaults={
                    'name': s.get('name', ''),
                    'contact_person': s.get('contact_person', ''),
                    'phone': s.get('phone', ''),
                    'email': s.get('email', ''),
                    'address': s.get('address', ''),
                    'notes': s.get('notes', ''),
                }
            )
        print(f"Synced {len(suppliers_data)} suppliers.")

    # 2. Sync Ingredients
    print("Fetching ingredients...")
    ingredients_data = fetch_json('inventory/ingredients/')
    if ingredients_data:
        for ing in ingredients_data:
            supplier_id = ing.get('preferred_supplier')
            supplier = Supplier.objects.filter(id=supplier_id).first() if supplier_id else None
            Ingredient.objects.update_or_create(
                id=ing['id'],
                defaults={
                    'name': ing['name'],
                    'category': ing.get('category', 'OTHER'),
                    'unit': ing.get('unit', 'g'),
                    'current_stock': Decimal(str(ing.get('current_stock', 0))),
                    'reorder_point': Decimal(str(ing.get('reorder_point', 0))),
                    'cost_per_unit': Decimal(str(ing.get('cost_per_unit', 0))),
                    'package_size': Decimal(str(ing.get('package_size', 1))),
                    'package_cost': Decimal(str(ing.get('package_cost', 0))),
                    'package_unit': ing.get('package_unit', ing.get('unit', 'g')),
                    'preferred_supplier': supplier,
                    'notes': ing.get('notes', ''),
                }
            )
        print(f"Synced {len(ingredients_data)} ingredients.")

    # 2b. Sync Stock Transactions
    print("Fetching stock transactions...")
    tx_data = fetch_json('inventory/transactions/')
    if tx_data:
        for tx in tx_data:
            ing_id = tx.get('ingredient')
            ing = Ingredient.objects.filter(id=ing_id).first() if ing_id else None
            if ing:
                StockTransaction.objects.update_or_create(
                    id=tx['id'],
                    defaults={
                        'ingredient': ing,
                        'transaction_type': tx['transaction_type'],
                        'quantity_change': Decimal(str(tx['quantity_change'])),
                        'previous_stock': Decimal(str(tx['previous_stock'])),
                        'new_stock': Decimal(str(tx['new_stock'])),
                        'reason': tx.get('reason', ''),
                        'reference_id': tx.get('reference_id', ''),
                        'created_by': admin_user,
                    }
                )
        print(f"Synced {len(tx_data)} stock transactions.")

    # 3. Sync Categories, Products, Variants
    print("Fetching products & categories...")
    cats_data = fetch_json('products/categories/')
    if cats_data:
        for cat in cats_data:
            Category.objects.update_or_create(
                id=cat['id'],
                defaults={
                    'name': cat['name'],
                    'description': cat.get('description', '')
                }
            )

    prods_data = fetch_json('products/products/')
    if prods_data:
        for prod in prods_data:
            cat_id = prod.get('category')
            cat = Category.objects.filter(id=cat_id).first() if cat_id else None
            Product.objects.update_or_create(
                id=prod['id'],
                defaults={
                    'name': prod['name'],
                    'category': cat,
                    'description': prod.get('description', ''),
                    'is_active': prod.get('is_active', True),
                }
            )

    vars_data = fetch_json('products/variants/')
    if vars_data:
        for v in vars_data:
            prod_id = v.get('product')
            prod = Product.objects.filter(id=prod_id).first() if prod_id else None
            if prod:
                ProductVariant.objects.update_or_create(
                    id=v['id'],
                    defaults={
                        'product': prod,
                        'name': v['name'],
                        'sku': v.get('sku', ''),
                        'selling_price': Decimal(str(v.get('selling_price', 0))),
                        'current_finished_stock': int(float(v.get('current_finished_stock', 0))),
                        'is_active': v.get('is_active', True),
                    }
                )
        print(f"Synced {len(vars_data)} variants.")

    # 4. Sync Packaging Items
    print("Fetching packaging items...")
    pkg_data = fetch_json('costing/packaging-items/')
    if pkg_data:
        for p in pkg_data:
            PackagingItem.objects.update_or_create(
                id=p['id'],
                defaults={
                    'name': p['name'],
                    'unit': p.get('unit', 'pcs'),
                    'current_stock': Decimal(str(p.get('current_stock', 0))),
                    'reorder_point': Decimal(str(p.get('reorder_point', 0))),
                    'cost_per_unit': Decimal(str(p.get('cost_per_unit', 0))),
                    'package_size': Decimal(str(p.get('package_size', 1))),
                    'package_cost': Decimal(str(p.get('package_cost', 0))),
                    'notes': p.get('notes', ''),
                }
            )
        print(f"Synced {len(pkg_data)} packaging items.")

    # 5. Sync Costing Recipes
    print("Fetching recipes...")
    recipes_data = fetch_json('costing/recipes/')
    if recipes_data:
        for r in recipes_data:
            variant_id = r.get('product_variant')
            variant = ProductVariant.objects.filter(id=variant_id).first() if variant_id else None
            recipe_obj, _ = Recipe.objects.update_or_create(
                id=r['id'],
                defaults={
                    'product_variant': variant,
                    'name': r.get('name', ''),
                    'batch_yield': Decimal(str(r.get('batch_yield', 1))),
                    'batch_size_desc': r.get('batch_size_desc', ''),
                    'packaging_cost': Decimal(str(r.get('packaging_cost', 0))),
                    'shipping_cost': Decimal(str(r.get('shipping_cost', 0))),
                    'electricity_cost': Decimal(str(r.get('electricity_cost', 0))),
                    'labor_cost': Decimal(str(r.get('labor_cost', 0))),
                    'notes': r.get('notes', ''),
                }
            )

            # Sync ingredients for this recipe
            if 'recipe_ingredients' in r:
                for ri in r['recipe_ingredients']:
                    ing_id = ri.get('ingredient')
                    ing = Ingredient.objects.filter(id=ing_id).first() if ing_id else None
                    if ing:
                        RecipeIngredient.objects.update_or_create(
                            id=ri['id'],
                            defaults={
                                'recipe': recipe_obj,
                                'ingredient': ing,
                                'quantity_used': Decimal(str(ri.get('quantity_used', 0))),
                                'unit': ri.get('unit', ing.unit),
                            }
                        )

            # Sync packagings for this recipe
            if 'recipe_packagings' in r:
                for rp in r['recipe_packagings']:
                    p_id = rp.get('packaging_item')
                    pkg = PackagingItem.objects.filter(id=p_id).first() if p_id else None
                    if pkg:
                        RecipePackaging.objects.update_or_create(
                            id=rp['id'],
                            defaults={
                                'recipe': recipe_obj,
                                'packaging_item': pkg,
                                'quantity_used': Decimal(str(rp.get('quantity_used', 1))),
                            }
                        )
        print(f"Synced {len(recipes_data)} recipes.")

    # 6. Sync Production Orders
    print("Fetching production orders...")
    prod_orders_data = fetch_json('production/orders/')
    admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if prod_orders_data:
        for po in prod_orders_data:
            variant_id = po.get('product_variant')
            variant = ProductVariant.objects.filter(id=variant_id).first() if variant_id else None
            rec_id = po.get('recipe')
            recipe = Recipe.objects.filter(id=rec_id).first() if rec_id else None

            p_order, _ = ProductionOrder.objects.update_or_create(
                id=po['id'],
                defaults={
                    'production_number': po['production_number'],
                    'recipe': recipe,
                    'product_variant': variant,
                    'production_date': po['production_date'],
                    'batches_count': Decimal(str(po.get('batches_count', 1))),
                    'planned_yield': int(float(po.get('planned_yield', 1))),
                    'actual_yield': int(float(po.get('actual_yield', 1))),
                    'status': po.get('status', ProductionStatus.COMPLETED),
                    'total_production_cost': Decimal(str(po.get('total_production_cost', 0))),
                    'cost_per_unit': Decimal(str(po.get('cost_per_unit', 0))),
                    'notes': po.get('notes', ''),
                    'created_by': admin_user,
                }
            )

            if 'ingredient_usages' in po:
                for iu in po['ingredient_usages']:
                    ing_id = iu.get('ingredient')
                    ing = Ingredient.objects.filter(id=ing_id).first() if ing_id else None
                    if ing:
                        ProductionIngredientUsage.objects.update_or_create(
                            id=iu['id'],
                            defaults={
                                'production_order': p_order,
                                'ingredient': ing,
                                'required_quantity': Decimal(str(iu.get('required_quantity', 0))),
                                'actual_quantity_used': Decimal(str(iu.get('actual_quantity_used', 0))),
                                'unit': iu.get('unit', ing.unit),
                                'unit_cost_snapshot': Decimal(str(iu.get('unit_cost_snapshot', 0))),
                                'total_cost': Decimal(str(iu.get('total_cost', 0))),
                            }
                        )
        print(f"Synced {len(prod_orders_data)} production orders.")

    # 7. Sync Sales Orders
    print("Fetching sales orders...")
    sales_orders_data = fetch_json('sales/orders/')
    if sales_orders_data:
        for so in sales_orders_data:
            SaleOrder.objects.update_or_create(
                id=so['id'],
                defaults={
                    'receipt_number': so['receipt_number'],
                    'sale_date': so['sale_date'],
                    'customer_name': so.get('customer_name', ''),
                    'payment_method': so.get('payment_method', PaymentMethod.CASH),
                    'subtotal': Decimal(str(so.get('subtotal', 0))),
                    'discount': Decimal(str(so.get('discount', 0))),
                    'total_sales': Decimal(str(so.get('total_sales', 0))),
                    'total_cogs': Decimal(str(so.get('total_cogs', 0))),
                    'gross_profit': Decimal(str(so.get('gross_profit', 0))),
                    'notes': so.get('notes', ''),
                    'created_by': admin_user,
                }
            )
        print(f"Synced {len(sales_orders_data)} sales orders.")

    # 8. Sync Customer Inquiries (The Real Live Orders!)
    print("Fetching customer inquiries (real customer orders)...")
    inquiries_data = fetch_json('sales/inquiries/')
    if inquiries_data:
        for inq in inquiries_data:
            conv_sale_id = inq.get('converted_sale')
            conv_sale = SaleOrder.objects.filter(id=conv_sale_id).first() if conv_sale_id else None
            inq_obj, created = CustomerInquiry.objects.update_or_create(
                id=inq['id'],
                defaults={
                    'inquiry_number': inq['inquiry_number'],
                    'customer_name': inq.get('customer_name', ''),
                    'customer_phone': inq.get('customer_phone', ''),
                    'target_date': inq.get('target_date'),
                    'items_summary': inq.get('items_summary', ''),
                    'items_json': inq.get('items_json', []),
                    'estimated_total': Decimal(str(inq.get('estimated_total', 0))),
                    'notes': inq.get('notes', ''),
                    'status': inq.get('status', InquiryStatus.PENDING),
                    'converted_sale': conv_sale,
                }
            )

            # Auto-convert completed inquiry to SaleOrder if not yet converted!
            if inq_obj.status == InquiryStatus.COMPLETED and not inq_obj.converted_sale:
                sale = inq_obj.auto_create_sale_order()
                print(f"  -> Converted completed inquiry {inq_obj.customer_name} to SaleOrder {sale.receipt_number}")

        print(f"Synced {len(inquiries_data)} customer inquiries.")

    # 9. Sync Expenses
    print("Fetching expenses...")
    expenses_data = fetch_json('expenses/records/')
    if expenses_data:
        for exp in expenses_data:
            Expense.objects.update_or_create(
                id=exp['id'],
                defaults={
                    'date': exp['date'],
                    'category': exp.get('category', 'OTHER'),
                    'amount': Decimal(str(exp.get('amount', 0))),
                    'payment_method': exp.get('payment_method', 'Cash'),
                    'description': exp.get('description', ''),
                    'receipt_reference': exp.get('receipt_reference', ''),
                    'notes': exp.get('notes', ''),
                    'created_by': admin_user,
                }
            )
        print(f"Synced {len(expenses_data)} expenses.")

    # 10. Sync Settings
    print("Fetching business settings...")
    settings_data = fetch_json('settings/general/')
    if settings_data and 'business_name' in settings_data:
        BusinessSettings.objects.update_or_create(
            id=1,
            defaults={
                'business_name': settings_data.get('business_name', 'CRAVEABLES'),
                'tagline': settings_data.get('tagline', 'MADE TO CRAVE • BAKED WITH LOVE'),
                'contact_phone': settings_data.get('contact_phone', ''),
                'contact_email': settings_data.get('contact_email', ''),
                'address': settings_data.get('address', ''),
                'target_profit_margin_pct': Decimal(str(settings_data.get('target_profit_margin_pct', 40))),
                'low_stock_threshold_pct': Decimal(str(settings_data.get('low_stock_threshold_pct', 20))),
                'auto_deduct_inventory': settings_data.get('auto_deduct_inventory', True),
                'notify_low_stock': settings_data.get('notify_low_stock', True),
            }
        )
        print("Synced business settings.")

    print("\n=== VERIFYING LOCAL DATABASE TOTALS ===")
    print(f"Total Customer Inquiries: {CustomerInquiry.objects.count()}")
    for inq in CustomerInquiry.objects.all():
        print(f"  - [{inq.status}] {inq.customer_name} ({inq.customer_phone}) -> ₱{inq.estimated_total} | Sale: {inq.converted_sale_id}")
    print(f"Total Official Sales Orders: {SaleOrder.objects.count()}")
    for s in SaleOrder.objects.all():
        print(f"  - {s.receipt_number}: {s.customer_name} -> ₱{s.total_sales}")
    print(f"Total Production Orders: {ProductionOrder.objects.count()}")
    print(f"Total Ingredients: {Ingredient.objects.count()}")

    # Dump the database backup to live_data.json and database_backup.json
    print("\nExporting full database dump to live_data.json and database_backup.json...")
    from django.core.management import call_command
    with open('live_data.json', 'w', encoding='utf-8') as f:
        call_command('dumpdata', '--natural-foreign', '--natural-primary', '-e', 'contenttypes', '-e', 'auth.Permission', '--indent', '2', stdout=f)
    with open('database_backup.json', 'w', encoding='utf-8') as f:
        call_command('dumpdata', '--natural-foreign', '--natural-primary', '-e', 'contenttypes', '-e', 'auth.Permission', '--indent', '2', stdout=f)
    print("Database export complete!")

if __name__ == '__main__':
    sync_data()
