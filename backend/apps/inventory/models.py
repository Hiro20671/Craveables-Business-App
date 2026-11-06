from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal

class MeasurementUnit(models.TextChoices):
    GRAMS = 'g', 'Grams (g)'
    KILOGRAMS = 'kg', 'Kilograms (kg)'
    MILLILITERS = 'ml', 'Milliliters (ml)'
    LITERS = 'L', 'Liters (L)'
    PIECES = 'pcs', 'Pieces (pcs)'

class TransactionType(models.TextChoices):
    INITIAL = 'INITIAL', 'Initial Stock'
    PURCHASE = 'PURCHASE', 'Purchase Restock'
    PRODUCTION_USAGE = 'PRODUCTION_USAGE', 'Production Usage'
    MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', 'Manual Adjustment'
    WASTE_SPOILAGE = 'WASTE_SPOILAGE', 'Waste / Spoilage'
    RETURN = 'RETURN', 'Return'

class Ingredient(models.Model):
    name = models.CharField(max_length=200, unique=True)
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='ingredients')
    supplier_name_raw = models.CharField(max_length=150, blank=True, default='')
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total cost paid for the package")
    package_size = models.DecimalField(max_digits=10, decimal_places=2, default=1000.00, help_text="Quantity in package")
    unit = models.CharField(max_length=20, default=MeasurementUnit.GRAMS)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000, help_text="Cost per 1 base unit (e.g. per gram or pcs)")
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Current available stock in base units")
    minimum_stock_level = models.DecimalField(max_digits=12, decimal_places=2, default=100.00)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=200.00)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.package_size and self.package_size > 0:
            self.cost_per_unit = round(Decimal(str(self.purchase_cost)) / Decimal(str(self.package_size)), 4)
        super().save(*args, **kwargs)

    @property
    def stock_value(self):
        return round(Decimal(str(self.current_stock)) * Decimal(str(self.cost_per_unit)), 2)

    @property
    def stock_status(self):
        if self.current_stock <= 0:
            return 'OUT_OF_STOCK'
        if self.current_stock <= self.reorder_level:
            return 'LOW'
        return 'NORMAL'

    def __str__(self):
        return f"{self.name} ({self.current_stock} {self.unit})"

class StockTransaction(models.Model):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    quantity_change = models.DecimalField(max_digits=12, decimal_places=2, help_text="Negative for deductions, positive for additions")
    previous_stock = models.DecimalField(max_digits=12, decimal_places=2)
    new_stock = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=255)
    reference_id = models.CharField(max_length=100, blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ingredient.name} [{self.transaction_type}]: {self.quantity_change:+} {self.ingredient.unit}"

