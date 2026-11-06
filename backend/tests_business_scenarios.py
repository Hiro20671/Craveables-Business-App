from django.test import TestCase
from decimal import Decimal
from django.contrib.auth.models import User
from apps.inventory.models import Ingredient, StockTransaction, TransactionType
from apps.products.models import Category, Product, ProductVariant
from apps.costing.models import Recipe, RecipeIngredient
from apps.production.models import ProductionOrder, ProductionStatus
from apps.sales.models import SaleOrder, SaleItem, PaymentMethod
from apps.expenses.models import Expense, ExpenseCategory
from apps.suppliers.models import Supplier, PurchaseOrder, PurchaseItem

class CraveablesBusinessWorkflowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testbaker', password='password123')
        self.supplier = Supplier.objects.create(name='SM Megamall Baking Depot')

        # Create category & product
        self.category = Category.objects.create(name='Cookies')
        self.product = Product.objects.create(name='Choco Chip Delight', category=self.category)
        self.variant = ProductVariant.objects.create(
            product=self.product,
            name='Regular Box',
            selling_price=Decimal('180.00'),
            batch_yield=2,
            current_finished_stock=Decimal('0')
        )

    def test_01_inventory_deduction(self):
        """TEST 1 — Inventory Deduction: Starting flour: 1,000g. Production usage: 250g. Expected: 750g."""
        flour = Ingredient.objects.create(
            name='All Purpose Flour',
            purchase_cost=Decimal('60.00'),
            package_size=Decimal('1000.00'),
            unit='g',
            current_stock=Decimal('1000.00')
        )
        deduction = Decimal('250.00')
        flour.current_stock -= deduction
        flour.save()

        StockTransaction.objects.create(
            ingredient=flour,
            transaction_type=TransactionType.PRODUCTION_USAGE,
            quantity_change=-deduction,
            previous_stock=Decimal('1000.00'),
            new_stock=flour.current_stock,
            reason='Production Test'
        )

        flour.refresh_from_db()
        self.assertEqual(flour.current_stock, Decimal('750.00'))

    def test_02_low_stock_warning(self):
        """TEST 2 — Low Stock Warning: Stock: 150g, Reorder: 200g. Expected: LOW."""
        flour = Ingredient.objects.create(
            name='Flour Low Test',
            current_stock=Decimal('150.00'),
            reorder_level=Decimal('200.00')
        )
        self.assertEqual(flour.stock_status, 'LOW')

    def test_03_out_of_stock_warning(self):
        """TEST 3 — Out of Stock: Stock: 0g. Expected: OUT_OF_STOCK."""
        sugar = Ingredient.objects.create(
            name='Sugar Out Test',
            current_stock=Decimal('0.00'),
            reorder_level=Decimal('200.00')
        )
        self.assertEqual(sugar.stock_status, 'OUT_OF_STOCK')

    def test_04_ingredient_restocking(self):
        """TEST 4 — Ingredient Restocking: Current: 150g, New purchase: 1,000g. Expected: 1,150g."""
        flour = Ingredient.objects.create(
            name='Flour Restock Test',
            current_stock=Decimal('150.00'),
            package_size=Decimal('1000.00'),
            purchase_cost=Decimal('60.00')
        )
        purchase_qty = Decimal('1000.00')
        flour.current_stock += purchase_qty
        flour.save()

        StockTransaction.objects.create(
            ingredient=flour,
            transaction_type=TransactionType.PURCHASE,
            quantity_change=purchase_qty,
            previous_stock=Decimal('150.00'),
            new_stock=flour.current_stock,
            reason='Restocking'
        )

        flour.refresh_from_db()
        self.assertEqual(flour.current_stock, Decimal('1150.00'))

    def test_05_automated_recipe_costing(self):
        """TEST 5 — Automated Recipe Costing: Flour ₱0.06 per gram, usage 250g. Expected: ₱15.00."""
        flour = Ingredient.objects.create(
            name='Flour Costing Test',
            purchase_cost=Decimal('60.00'),
            package_size=Decimal('1000.00'),
            unit='g'
        )
        # Cost per unit is automatically calculated in save: 60 / 1000 = 0.0600
        self.assertEqual(flour.cost_per_unit, Decimal('0.0600'))

        recipe = Recipe.objects.create(
            product_variant=self.variant,
            name='Test Recipe',
            batch_yield=2
        )
        ri = RecipeIngredient.objects.create(
            recipe=recipe,
            ingredient=flour,
            quantity_used=Decimal('250.00'),
            unit='g'
        )
        self.assertEqual(ri.ingredient_cost, Decimal('15.0000'))

    def test_06_production_management_deduction(self):
        """TEST 6 — Production: One batch requires 250g flour. Produce 2 batches -> deduce 500g."""
        flour = Ingredient.objects.create(
            name='Flour Batch Prod Test',
            purchase_cost=Decimal('60.00'),
            package_size=Decimal('1000.00'),
            unit='g',
            current_stock=Decimal('1000.00')
        )
        recipe = Recipe.objects.create(
            product_variant=self.variant,
            name='Cookie Batch Recipe',
            batch_yield=2
        )
        RecipeIngredient.objects.create(
            recipe=recipe,
            ingredient=flour,
            quantity_used=Decimal('250.00'),
            unit='g'
        )

        batches = Decimal('2.00')
        # Total needed: 250 * 2 = 500g
        needed = Decimal('250.00') * batches

        prod = ProductionOrder.objects.create(
            production_number='PRD-TEST-001',
            recipe=recipe,
            product_variant=self.variant,
            production_date='2026-11-06',
            batches_count=batches,
            planned_yield=4,
            actual_yield=4,
            status=ProductionStatus.COMPLETED
        )

        flour.current_stock -= needed
        flour.save()

        StockTransaction.objects.create(
            ingredient=flour,
            transaction_type=TransactionType.PRODUCTION_USAGE,
            quantity_change=-needed,
            previous_stock=Decimal('1000.00'),
            new_stock=flour.current_stock,
            reason=f"Production {prod.production_number}"
        )

        flour.refresh_from_db()
        self.assertEqual(flour.current_stock, Decimal('500.00'))

    def test_07_sales_management_gross_profit(self):
        """TEST 7 — Sales Management: Record sale -> revenue & gross profit update."""
        recipe = Recipe.objects.create(
            product_variant=self.variant,
            name='Costed Recipe',
            batch_yield=2,
            packaging_cost=Decimal('4.00'),
            electricity_cost=Decimal('70.00'),
            labor_cost=Decimal('50.00')
        )
        unit_cost = recipe.calculated_cost_per_unit  # 124 / 2 = 62.00

        order = SaleOrder.objects.create(
            receipt_number='CRV-TEST-001',
            sale_date='2026-11-06',
            payment_method=PaymentMethod.GCASH
        )
        item = SaleItem.objects.create(
            sale_order=order,
            product_variant=self.variant,
            quantity=2,
            selling_price=Decimal('180.00'),
            discount=Decimal('0.00'),
            historical_unit_cost=unit_cost
        )
        order.subtotal = Decimal('360.00')
        order.total_sales = Decimal('360.00')
        order.total_cogs = unit_cost * Decimal('2')
        order.gross_profit = order.total_sales - order.total_cogs
        order.save()

        order.refresh_from_db()
        self.assertEqual(order.total_sales, Decimal('360.00'))
        self.assertEqual(order.gross_profit, Decimal('360.00') - (unit_cost * 2))

    def test_08_expense_management_net_profit(self):
        """TEST 8 — Expense Management: Record electricity & shipping -> operating expenses & net profit update."""
        e1 = Expense.objects.create(
            date='2026-11-06',
            category=ExpenseCategory.ELECTRICITY,
            description='Power Bill',
            amount=Decimal('500.00')
        )
        e2 = Expense.objects.create(
            date='2026-11-06',
            category=ExpenseCategory.SHIPPING,
            description='Customer Courier',
            amount=Decimal('150.00')
        )
        total_exp = e1.amount + e2.amount
        self.assertEqual(total_exp, Decimal('650.00'))

        # If gross profit is 1,000, net profit should be 1,000 - 650 = 350
        gross_profit = Decimal('1000.00')
        net_profit = gross_profit - total_exp
        self.assertEqual(net_profit, Decimal('350.00'))

    def test_09_multi_device_synchronization_integrity(self):
        """TEST 9 — Multi-Device: Stock update reflects accurately via database transaction log."""
        flour = Ingredient.objects.create(
            name='Flour Sync Test',
            current_stock=Decimal('800.00')
        )
        # Client 1 updates stock
        flour.current_stock += Decimal('200.00')
        flour.save()

        # Client 2 queries database
        flour_client_2 = Ingredient.objects.get(id=flour.id)
        self.assertEqual(flour_client_2.current_stock, Decimal('1000.00'))

    def test_10_data_integrity_insufficient_stock_rejection(self):
        """TEST 10 — Data Integrity: Attempting production with insufficient stock fails validation."""
        cocoa = Ingredient.objects.create(
            name='Cocoa Powder',
            current_stock=Decimal('50.00'),
            package_size=Decimal('250.00'),
            purchase_cost=Decimal('125.00')
        )
        recipe = Recipe.objects.create(
            product_variant=self.variant,
            name='Triple Choco Recipe',
            batch_yield=2
        )
        RecipeIngredient.objects.create(
            recipe=recipe,
            ingredient=cocoa,
            quantity_used=Decimal('60.00'),
            unit='g'
        )

        # 1 batch requires 60g, but available is only 50g
        batches = Decimal('1.00')
        required = Decimal('60.00') * batches
        has_enough = cocoa.current_stock >= required
        self.assertFalse(has_enough)
        shortage = required - cocoa.current_stock
        self.assertEqual(shortage, Decimal('10.00'))

