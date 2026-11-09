import datetime
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from apps.products.models import ProductVariant


def parse_date_safe(val):
    if not val:
        return None
    if isinstance(val, datetime.datetime):
        return val.date()
    if isinstance(val, datetime.date):
        return val
    if isinstance(val, str):
        s = val.strip()[:10]
        if not s:
            return None
        try:
            return datetime.date.fromisoformat(s)
        except Exception:
            return None
    return None


def match_product_variant(item_name: str, price=None):
    """Smart matcher to map inquiry/order item names to the exact ProductVariant."""
    n = (item_name or '').lower()
    variants = list(ProductVariant.objects.select_related('product', 'recipe').all())
    if not variants:
        return None

    for v in variants:
        if v.display_name.lower() == n or v.name.lower() == n:
            return v

    if 'banana' in n:
        if 'big' in n or '400' in n:
            for v in variants:
                if 'banana' in v.product.name.lower() and ('big' in v.name.lower() or '400' in v.name.lower()):
                    return v
        if 'small' in n or '120' in n:
            for v in variants:
                if 'banana' in v.product.name.lower() and ('small' in v.name.lower() or '120' in v.name.lower()):
                    return v

    if 'brownie' in n:
        if 'small' in n or '3' in n:
            for v in variants:
                if 'brownie' in v.product.name.lower() and ('3' in v.name.lower() or 'small' in v.name.lower()):
                    return v
        if 'big' in n or '6' in n:
            for v in variants:
                if 'brownie' in v.product.name.lower() and ('6' in v.name.lower() or 'big' in v.name.lower()):
                    return v

    if 'cookie' in n or 'velvet' in n or 'choco' in n:
        is_single = (
            'single' in n
            or 'per pc' in n
            or '1 pc' in n
            or 'pcs' in n and 'box' not in n
            or (price is not None and float(price) <= 50)
        )
        if 'velvet' in n:
            for v in variants:
                if 'velvet' in v.name.lower() and (('single' in v.name.lower()) == is_single):
                    return v
        if 'choco' in n or 'classic' in n:
            for v in variants:
                if 'choco' in v.name.lower() and (('single' in v.name.lower()) == is_single):
                    return v

    if price is not None:
        for v in variants:
            if abs(float(v.selling_price) - float(price)) < 0.01:
                return v

    return variants[0]


class Customer(models.Model):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=50, blank=True, default='', db_index=True)
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    loyalty_card_number = models.CharField(max_length=50, blank=True, default='')
    loyalty_stamps = models.PositiveIntegerField(default=0, help_text="Current active stamps")
    manual_stamp_adjustment = models.IntegerField(default=0, help_text="Manual stamp adjustment by admin")
    rewards_redeemed = models.PositiveIntegerField(default=0, help_text="Number of 5-stamp rewards claimed")
    reward_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.phone or 'No Phone'})"

    @property
    def qualifying_orders_count(self):
        return self.orders.exclude(status='CANCELLED').filter(estimated_total__gte=Decimal('100.00')).count()

    def recalculate_loyalty_stamps(self, save=True):
        if not self.loyalty_card_number and self.pk:
            self.loyalty_card_number = f"CRV-LOY-{self.pk:04d}"
        auto_stamps = self.qualifying_orders_count
        computed = max(0, auto_stamps + int(self.manual_stamp_adjustment or 0) - (int(self.rewards_redeemed or 0) * 5))
        self.loyalty_stamps = computed
        if save and self.pk:
            Customer.objects.filter(pk=self.pk).update(
                loyalty_card_number=self.loyalty_card_number,
                loyalty_stamps=self.loyalty_stamps,
                manual_stamp_adjustment=self.manual_stamp_adjustment,
                rewards_redeemed=self.rewards_redeemed,
                reward_notes=self.reward_notes,
            )
        return self.loyalty_stamps

    @property
    def total_orders(self):
        return self.orders.count()

    @property
    def total_ordered_amount(self):
        total = self.orders.aggregate(total=models.Sum('estimated_total'))['total'] or Decimal('0.00')
        return round(total, 2)

    @property
    def total_paid_amount(self):
        # Include both CustomerPayment records and orders marked with amount_paid
        order_paid = self.orders.exclude(status='CANCELLED').aggregate(total=models.Sum('amount_paid'))['total'] or Decimal('0.00')
        payment_sum = self.payments.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        return round(max(order_paid, payment_sum), 2)

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
    customer_phone = models.CharField(max_length=50, blank=True, default='')
    order_type = models.CharField(max_length=50, default='REGULAR', help_text="REGULAR, WHOLESALE, CUSTOM, BULK, SPECIAL_EVENT")
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
        self.target_date = parse_date_safe(self.target_date)
        self.payment_due_date = parse_date_safe(self.payment_due_date)

        if not self.inquiry_number:
            today_str = timezone.now().strftime('%Y%m%d%H%M%S')
            count = CustomerInquiry.objects.count() + 1
            prefix = "CRV-WSL" if self.order_type == 'WHOLESALE' else "CRV-ORD"
            self.inquiry_number = f"{prefix}-{today_str}-{count:02d}"
        if not self.shared_order_number:
            self.shared_order_number = self.inquiry_number

        # Recalculate remaining balance
        est = Decimal(str(self.estimated_total if self.estimated_total not in [None, ''] else '0.00'))
        paid = Decimal(str(self.amount_paid if self.amount_paid not in [None, ''] else '0.00'))
        self.estimated_total = est
        self.amount_paid = paid
        self.remaining_balance = max(Decimal('0.00'), est - paid)

        # Automatic payment status determination
        today = timezone.now().date()
        due_date = self.payment_due_date
        if self.remaining_balance <= 0 and est > 0:
            self.payment_status = PaymentStatus.PAID
        elif paid > 0:
            if due_date and due_date < today:
                self.payment_status = PaymentStatus.OVERDUE
            elif due_date and (due_date - today).days <= 7:
                self.payment_status = PaymentStatus.DUE_SOON
            else:
                self.payment_status = PaymentStatus.PARTIALLY_PAID
        else:
            if due_date and due_date < today:
                self.payment_status = PaymentStatus.OVERDUE
            elif due_date and (due_date - today).days <= 7:
                self.payment_status = PaymentStatus.DUE_SOON
            else:
                self.payment_status = PaymentStatus.UNPAID

        # Auto-link Customer record if not yet linked so every customer gets a Loyalty Card automatically
        if not self.customer_id and self.customer_name and self.customer_name.strip():
            clean_name = self.customer_name.strip()
            clean_phone = (self.customer_phone or '').strip()
            cust = Customer.objects.filter(name__iexact=clean_name).first()
            if not cust and clean_phone:
                cust = Customer.objects.filter(phone=clean_phone).first()
            if not cust:
                cust = Customer.objects.create(
                    name=clean_name,
                    phone=clean_phone,
                    address=self.delivery_address or '',
                    notes=f"Auto-enrolled in CRAVEABLES Loyalty Card on {timezone.now().strftime('%Y-%m-%d')}"
                )
                cust.recalculate_loyalty_stamps()
            self.customer = cust

        super().save(*args, **kwargs)

        if self.customer:
            self.customer.recalculate_loyalty_stamps()

        # Auto-connect to SaleOrder when order is PAID
        if self.status != InquiryStatus.CANCELLED and self.payment_status == PaymentStatus.PAID:
            self.auto_create_sale_order()

    def auto_create_sale_order(self):
        """Creates or updates the official SaleOrder and SaleItems for a paid or completed order."""
        sale_receipt = self.shared_order_number or self.inquiry_number
        sale_order = self.converted_sale

        if not sale_order:
            sale_order = SaleOrder.objects.filter(receipt_number=sale_receipt).first()

        pm = PaymentMethod.CASH
        latest_payment = self.payments.order_by('-payment_date', '-id').first()
        if latest_payment and latest_payment.payment_method in PaymentMethod.values:
            pm = latest_payment.payment_method
        elif hasattr(self, 'payment_type') and self.payment_type in PaymentMethod.values:
            pm = self.payment_type
        elif hasattr(self, 'payment_type') and 'gcash' in str(self.payment_type).lower():
            pm = PaymentMethod.GCASH

        order_label = "Wholesale Reseller Order" if self.order_type == 'WHOLESALE' else "Customer Order"

        if not sale_order:
            sale_order = SaleOrder.objects.create(
                receipt_number=sale_receipt,
                sale_date=self.target_date or timezone.now().date(),
                customer=self.customer,
                customer_name=self.customer_name,
                payment_method=pm,
                subtotal=self.estimated_total,
                discount=Decimal('0.00'),
                total_sales=self.estimated_total,
                total_cogs=Decimal('0.00'),
                gross_profit=self.estimated_total,
                notes=f"Completed {order_label} {sale_receipt}. {self.notes}".strip(),
            )

        # Populate or repair SaleItems if missing
        if sale_order.items.count() == 0:
            total_cogs = Decimal('0.00')
            total_subtotal = Decimal('0.00')
            total_discount = Decimal('0.00')
            items_data = self.items_json or []

            for item in items_data:
                name = item.get('name', '')
                qty = max(1, int(float(item.get('qty', 1) or 1)))
                net_unit_price = Decimal(str(item.get('price', '0.00')))
                reg_unit_price = Decimal(str(item.get('regular_price', net_unit_price)))
                item_discount = Decimal(str(item.get('discount', max(Decimal('0.00'), (reg_unit_price - net_unit_price) * Decimal(str(qty))))))

                variant = match_product_variant(name, reg_unit_price)

                unit_cost = Decimal('0.0000')
                if variant and hasattr(variant, 'recipe') and variant.recipe:
                    unit_cost = variant.recipe.calculated_cost_per_unit

                item_cost = unit_cost * Decimal(str(qty))
                total_cogs += item_cost
                total_subtotal += (reg_unit_price * Decimal(str(qty)))
                total_discount += item_discount

                if variant:
                    SaleItem.objects.create(
                        sale_order=sale_order,
                        product_variant=variant,
                        quantity=qty,
                        selling_price=reg_unit_price if reg_unit_price > 0 else variant.selling_price,
                        discount=item_discount,
                        historical_unit_cost=unit_cost
                    )

            if items_data:
                sale_order.subtotal = total_subtotal if total_subtotal > 0 else self.estimated_total
                sale_order.discount = total_discount
                sale_order.total_sales = self.estimated_total
                sale_order.total_cogs = total_cogs
                sale_order.gross_profit = sale_order.total_sales - total_cogs
                sale_order.payment_method = pm
                sale_order.save()

        if self.converted_sale_id != sale_order.id:
            self.converted_sale = sale_order
            CustomerInquiry.objects.filter(pk=self.pk).update(converted_sale=sale_order)

        return sale_order

    def __str__(self):
        return f"{self.inquiry_number} - {self.customer_name} (₱{self.estimated_total:.2f}) [{self.status}]"


def sync_all_inquiries_to_sales():
    """Ensures all paid orders are synced to SaleOrder, balances are accurate, and every customer has a Loyalty Card."""
    today = timezone.now().date()
    for inq in CustomerInquiry.objects.select_related('converted_sale', 'customer').all():
        est = Decimal(str(inq.estimated_total or '0.00'))
        paid = Decimal(str(inq.amount_paid or '0.00'))
        expected_bal = max(Decimal('0.00'), est - paid)
        due_date = parse_date_safe(inq.payment_due_date)

        if expected_bal <= 0 and est > 0:
            p_status = PaymentStatus.PAID
        elif paid > 0:
            if due_date and due_date < today:
                p_status = PaymentStatus.OVERDUE
            elif due_date and (due_date - today).days <= 7:
                p_status = PaymentStatus.DUE_SOON
            else:
                p_status = PaymentStatus.PARTIALLY_PAID
        else:
            if due_date and due_date < today:
                p_status = PaymentStatus.OVERDUE
            elif due_date and (due_date - today).days <= 7:
                p_status = PaymentStatus.DUE_SOON
            else:
                p_status = PaymentStatus.UNPAID

        # Auto-link customer if missing
        cust = inq.customer
        if not cust and inq.customer_name and inq.customer_name.strip():
            clean_name = inq.customer_name.strip()
            clean_phone = (inq.customer_phone or '').strip()
            cust = Customer.objects.filter(name__iexact=clean_name).first()
            if not cust:
                cust = Customer.objects.create(
                    name=clean_name,
                    phone=clean_phone,
                    address=inq.delivery_address or '',
                    notes="Auto-enrolled in CRAVEABLES Loyalty Card"
                )
            inq.customer = cust
            CustomerInquiry.objects.filter(pk=inq.pk).update(customer=cust)

        if inq.remaining_balance != expected_bal or inq.payment_status != p_status:
            inq.remaining_balance = expected_bal
            inq.payment_status = p_status
            CustomerInquiry.objects.filter(pk=inq.pk).update(
                remaining_balance=expected_bal,
                payment_status=p_status
            )

        if inq.status != InquiryStatus.CANCELLED and inq.payment_status == PaymentStatus.PAID:
            try:
                inq.auto_create_sale_order()
            except Exception:
                pass

    for cust in Customer.objects.all():
        cust.recalculate_loyalty_stamps()


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
    image = models.FileField(upload_to='featured_orders/')
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
