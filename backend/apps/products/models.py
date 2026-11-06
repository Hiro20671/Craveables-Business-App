from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

class Product(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ARCHIVED', 'Archived'),
    ]

    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    image_url = models.CharField(max_length=500, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=150, help_text="e.g. Small (120g), Big (400g), Choco Chip, 6 pieces")
    sku = models.CharField(max_length=50, blank=True, default='')
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    batch_yield = models.PositiveIntegerField(default=1, help_text="Default units per batch in recipe")
    current_finished_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Finished goods available for immediate sale")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'name')

    def __str__(self):
        return f"{self.product.name} — {self.name}"

    @property
    def display_name(self):
        return f"{self.product.name} — {self.name}"

