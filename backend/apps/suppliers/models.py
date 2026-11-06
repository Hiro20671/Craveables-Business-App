from django.db import models
from django.contrib.auth.models import User

class Supplier(models.Model):
    name = models.CharField(max_length=200, unique=True)
    contact_person = models.CharField(max_length=150, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class PurchaseOrderStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    RECEIVED = 'RECEIVED', 'Received & Stocked'
    CANCELLED = 'CANCELLED', 'Cancelled'

class PurchaseOrder(models.Model):
    po_number = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    purchase_date = models.DateField()
    status = models.CharField(max_length=20, choices=PurchaseOrderStatus.choices, default=PurchaseOrderStatus.RECEIVED)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_method = models.CharField(max_length=50, default='Cash')
    notes = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.po_number} - {self.supplier.name} (₱{self.total_amount})"

class PurchaseItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    ingredient = models.ForeignKey('inventory.Ingredient', on_delete=models.CASCADE, related_name='purchase_items')
    package_size = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20)
    quantity_packages = models.DecimalField(max_digits=10, decimal_places=2, default=1.0)
    total_quantity = models.DecimalField(max_digits=12, decimal_places=2)
    package_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.ingredient.name} x {self.quantity_packages} pkgs"

