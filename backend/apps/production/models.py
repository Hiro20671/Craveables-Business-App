from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from apps.costing.models import Recipe
from apps.products.models import ProductVariant
from apps.inventory.models import Ingredient

class ProductionStatus(models.TextChoices):
    PLANNED = 'PLANNED', 'Planned'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed & Deducted'
    CANCELLED = 'CANCELLED', 'Cancelled'

class ProductionOrder(models.Model):
    production_number = models.CharField(max_length=50, unique=True)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='production_runs')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='productions')
    production_date = models.DateField()
    batches_count = models.DecimalField(max_digits=8, decimal_places=2, default=1.00)
    planned_yield = models.PositiveIntegerField()
    actual_yield = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=ProductionStatus.choices, default=ProductionStatus.PLANNED)
    total_production_cost = models.DecimalField(max_digits=12, decimal_places=4, default=0.0000)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    notes = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-production_date', '-id']

    def __str__(self):
        return f"{self.production_number} - {self.product_variant} ({self.batches_count} batches)"

class ProductionIngredientUsage(models.Model):
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.CASCADE, related_name='ingredient_usages')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    required_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    actual_quantity_used = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20)
    unit_cost_snapshot = models.DecimalField(max_digits=10, decimal_places=4)
    total_cost = models.DecimalField(max_digits=12, decimal_places=4)

    def __str__(self):
        return f"{self.ingredient.name}: {self.actual_quantity_used} {self.unit} for {self.production_order.production_number}"

