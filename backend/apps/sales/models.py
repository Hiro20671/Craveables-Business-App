from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from apps.products.models import ProductVariant

class Customer(models.Model):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=50, db_index=True)
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.phone})"

    @property
    def total_orders(self):
        return self.orders.count()

    @property
    def total_ordered_amount(self):
        total = self.orders.aggregate(total=models.Sum('estimated_total'))['total'] or Decimal('0.00')
        return round(total, 2)

    @property
    def total_paid_amount(self):
        total = self.payments.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        return round(total, 2)

    @property
    def total_outstanding_balance(self):
        total = self.orders.exclude(status='CANCELLED').aggregate(balance=models.Sum('remaining_balance'))['balance'] or Decimal('0.00')
        return round(max(Decimal('0.00'), total), 2)

class PaymentMethod(models.TextChoices):
    CASH = 'Cash', 'Cash'
    GCASH = 'GCash', 'GCash'
    QR_PH = 'QR Ph', 'QR Ph'
    BANK_TRANSFER = 'Bank Transfer', 'Bank Transfer'
    OTHER = 'Other', 'Other'

class PaymentStatus(models.TextChoices):
    PAID = 'PAID', 'Fully Paid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    UNPAID = 'UNPAID', 'Unpaid'
    DUE_SOON = 'DUE_SOON', 'Due Soon'
    OVERDUE = 'OVERDUE', 'Overdue'

class InquiryStatus(models.TextChoices):
    NEW = 'NEW', 'New Order'
    PENDING = 'PENDING', 'Pending Confirmation'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    AWAITING_PAYMENT = 'AWAITING_PAYMENT', 'Awaiting Payment'
    SCHEDULED_PRODUCTION = 'SCHEDULED_PRODUCTION', 'Scheduled for Production'
    BAKING = 'BAKING', 'In Production'
    READY = 'READY', 'Ready for Pickup / Delivery'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class SaleOrder(models.Model):
    receipt_number = models.CharField(max_length=50, unique=True)
    sale_date = models.DateField()
    customer_name = models.CharField(max_length=150, blank=True, default='')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
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

class CustomerInquiry(models.Model):
    inquiry_number = models.CharField(max_length=50, unique=True)
    shared_order_number = models.CharField(max_length=50, blank=True, default='', db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=50)
    order_type = models.CharField(max_length=50, default='REGULAR', help_text="REGULAR, CUSTOM, BULK, SPECIAL_EVENT")
    delivery_method = models.CharField(max_length=20, default='PICKUP', help_text="PICKUP or DELIVERY")
    delivery_address = models.TextField(blank=True, default='')
    special_instructions = models.TextField(blank=True, default='')
    target_date = models.DateField(null=True, blank=True)
    items_summary = models.TextField(blank=True, default='')
    items_json = models.JSONField(default=list, blank=True)
    estimated_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=30, choices=InquiryStatus.choices, default=InquiryStatus.PENDING)
    converted_sale = models.ForeignKey(SaleOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')

    # Payment Tracking / Receivables Fields
    payment_type = models.CharField(max_length=50, default='PAY_ON_PICKUP')
    initial_deposit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_due_date = models.DateField(null=True, blank=True)
    payment_status = models.CharField(max_length=30, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    payment_notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.inquiry_number:
            today_str = timezone.now().strftime('%Y%m%d')
            count = CustomerInquiry.objects.filter(created_at__date=timezone.now().date()).count() + 1
            self.inquiry_number = f"CRV-ORD-{today_str}-{count:04d}"
        if not self.shared_order_number:
            self.shared_order_number = self.inquiry_number
        # Recalculate remaining balance
        est = Decimal(str(self.estimated_total or '0.00'))
        paid = Decimal(str(self.amount_paid or '0.00'))
        self.remaining_balance = max(Decimal('0.00'), est - paid)

        # Automatic status determination
        today = timezone.now().date()
        if self.remaining_balance <= 0:
            self.payment_status = PaymentStatus.PAID
        elif paid > 0:
            if self.payment_due_date and self.payment_due_date < today:
                self.payment_status = PaymentStatus.OVERDUE
            elif self.payment_due_date and (self.payment_due_date - today).days <= 7:
                self.payment_status = PaymentStatus.DUE_SOON
            else:
                self.payment_status = PaymentStatus.PARTIALLY_PAID
        else:
            if self.payment_due_date and self.payment_due_date < today:
                self.payment_status = PaymentStatus.OVERDUE
            elif self.payment_due_date and (self.payment_due_date - today).days <= 7:
                self.payment_status = PaymentStatus.DUE_SOON
            else:
                self.payment_status = PaymentStatus.UNPAID

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.inquiry_number} - {self.customer_name} (₱{self.estimated_total:.2f}) [{self.status}]"

class CustomerPayment(models.Model):
    order = models.ForeignKey(CustomerInquiry, on_delete=models.CASCADE, related_name='payments')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    payment_date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    reference_number = models.CharField(max_length=100, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-id']

    def __str__(self):
        return f"Payment ₱{self.amount:.2f} for {self.order.inquiry_number} via {self.payment_method}"

class FeaturedOrder(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='featured_orders/')
    category = models.CharField(max_length=100, default='Cookies')
    order_type = models.CharField(max_length=100, default='Bulk Order')
    order_date = models.DateField(null=True, blank=True)
    pieces_count = models.PositiveIntegerField(null=True, blank=True, help_text="Number of pieces in order (e.g. 60, 120)")
    is_featured = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.order_type}) - {'Published' if self.is_published else 'Draft'}"

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

