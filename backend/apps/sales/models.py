from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from apps.products.models import ProductVariant

class PaymentMethod(models.TextChoices):
    CASH = 'Cash', 'Cash'
    GCASH = 'GCash', 'GCash'
    QR_PH = 'QR Ph', 'QR Ph'
    BANK_TRANSFER = 'Bank Transfer', 'Bank Transfer'
    OTHER = 'Other', 'Other'

class SaleOrder(models.Model):
    receipt_number = models.CharField(max_length=50, unique=True)
    sale_date = models.DateField()
    customer_name = models.CharField(max_length=150, blank=True, default='')
    payment_method = models.CharField(max_length=50, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_cogs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total Cost of Goods Sold")
    gross_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sale_date', '-id']

    def __str__(self):
        return f"{self.receipt_number} - ₱{self.total_sales:.2f} ({self.payment_method})"

class SaleItem(models.Model):
    sale_order = models.ForeignKey(SaleOrder, on_delete=models.CASCADE, related_name='items')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='sales_items')
    quantity = models.PositiveIntegerField(default=1)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    historical_unit_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    gross_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        self.total_price = (Decimal(str(self.selling_price)) * Decimal(str(self.quantity))) - Decimal(str(self.discount))
        total_cost = Decimal(str(self.historical_unit_cost)) * Decimal(str(self.quantity))
        self.gross_profit = self.total_price - total_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product_variant.display_name} x {self.quantity}"

class InquiryStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending / New Inquiry'
    CONFIRMED = 'CONFIRMED', 'Confirmed Pre-Order'
    BAKING = 'BAKING', 'Baking / In Oven'
    COMPLETED = 'COMPLETED', 'Completed & Sold'
    CANCELLED = 'CANCELLED', 'Cancelled'

class CustomerInquiry(models.Model):
    inquiry_number = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=50)
    target_date = models.DateField(null=True, blank=True)
    items_summary = models.TextField(blank=True, default='')
    items_json = models.JSONField(default=list, blank=True)
    estimated_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=InquiryStatus.choices, default=InquiryStatus.PENDING)
    converted_sale = models.ForeignKey(SaleOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.inquiry_number} - {self.customer_name} (₱{self.estimated_total:.2f})"

class CustomerReview(models.Model):
    customer_name = models.CharField(max_length=150)
    customer_location = models.CharField(max_length=150, blank=True, default='')
    product_name = models.CharField(max_length=150, blank=True, default='')
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField()
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.customer_name} ({self.rating}★) - {'Approved' if self.is_approved else 'Pending'}"

