from django.db import models
from decimal import Decimal
from apps.products.models import ProductVariant
from apps.inventory.models import Ingredient

class PackagingItem(models.Model):
    name = models.CharField(max_length=150, unique=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total pack cost")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1.00, help_text="Units in pack")
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    default_needed_per_batch = models.DecimalField(max_digits=8, decimal_places=2, default=1.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.quantity and self.quantity > 0:
            self.cost_per_unit = round(Decimal(str(self.cost)) / Decimal(str(self.quantity)), 4)
        super().save(*args, **kwargs)

    @property
    def cost_per_need(self):
        return round(self.cost_per_unit * Decimal(str(self.default_needed_per_batch)), 4)

    def __str__(self):
        return f"{self.name} (₱{self.cost_per_unit:.4f}/unit)"

class Recipe(models.Model):
    product_variant = models.OneToOneField(ProductVariant, on_delete=models.CASCADE, related_name='recipe')
    name = models.CharField(max_length=200)
    batch_yield = models.PositiveIntegerField(default=1, help_text="Units produced per batch")
    batch_size_desc = models.CharField(max_length=100, blank=True, default='', help_text="e.g. 120 grams, 400 gms")
    packaging_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000, help_text="Packaging cost per batch")
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Shipping fee per batch")
    electricity_cost = models.DecimalField(max_digits=10, decimal_places=2, default=70.00, help_text="Kuryente per batch")
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, default=50.00, help_text="Labor / Other overhead per batch")
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_ingredient_cost(self):
        total = Decimal('0.00')
        for item in self.recipe_ingredients.all():
            total += item.ingredient_cost
        return round(total, 4)

    @property
    def calculated_packaging_cost(self):
        # If explicit recipe packaging items exist, sum them up; otherwise use packaging_cost field
        pack_items = self.recipe_packagings.all()
        if pack_items.exists():
            return round(sum(p.total_cost for p in pack_items), 4)
        return round(self.packaging_cost, 4)

    @property
    def total_overhead_cost(self):
        return round(self.calculated_packaging_cost + Decimal(str(self.shipping_cost)) + Decimal(str(self.electricity_cost)) + Decimal(str(self.labor_cost)), 4)

    @property
    def total_batch_cost(self):
        return round(self.total_ingredient_cost + self.total_overhead_cost, 4)

    @property
    def calculated_cost_per_unit(self):
        yield_count = Decimal(str(max(1, self.batch_yield)))
        return round(self.total_batch_cost / yield_count, 4)

    @property
    def selling_price(self):
        return self.product_variant.selling_price

    @property
    def profit_per_unit(self):
        return round(Decimal(str(self.selling_price)) - self.calculated_cost_per_unit, 4)

    @property
    def profit_margin(self):
        sp = Decimal(str(self.selling_price))
        if sp > 0:
            return round(float(self.profit_per_unit / sp), 4)
        return 0.0

    @property
    def profit_margin_percentage(self):
        return round(self.profit_margin * 100, 2)

    def __str__(self):
        return f"Recipe: {self.name} (Yield: {self.batch_yield})"

class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_usages')
    quantity_used = models.DecimalField(max_digits=10, decimal_places=2, help_text="Usage per batch in base units (g, ml, pcs)")
    unit = models.CharField(max_length=20, default='g')
    notes = models.CharField(max_length=150, blank=True, default='')

    @property
    def cost_per_unit(self):
        return self.ingredient.cost_per_unit

    @property
    def ingredient_cost(self):
        return round(Decimal(str(self.quantity_used)) * Decimal(str(self.cost_per_unit)), 4)

    def __str__(self):
        return f"{self.ingredient.name}: {self.quantity_used} {self.unit} for {self.recipe.name}"

class RecipePackaging(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_packagings')
    packaging_item = models.ForeignKey(PackagingItem, on_delete=models.CASCADE)
    quantity_needed = models.DecimalField(max_digits=8, decimal_places=2, default=1.00)

    @property
    def total_cost(self):
        return round(Decimal(str(self.quantity_needed)) * self.packaging_item.cost_per_unit, 4)

    def __str__(self):
        return f"{self.packaging_item.name} x {self.quantity_needed} for {self.recipe.name}"

