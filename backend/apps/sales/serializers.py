from rest_framework import serializers
from .models import (
    SaleOrder, SaleItem, CustomerInquiry, CustomerReview,
    Customer, CustomerPayment, FeaturedOrder
)

class FeaturedOrderSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    media_type = serializers.SerializerMethodField()

    class Meta:
        model = FeaturedOrder
        fields = [
            'id', 'title', 'description', 'image', 'image_url', 'media_type', 'category',
            'order_type', 'order_date', 'pieces_count', 'is_featured',
            'is_published', 'display_order', 'created_at', 'updated_at'
        ]

    def get_media_type(self, obj):
        if obj.image and obj.image.name:
            name_lower = obj.image.name.lower()
            if name_lower.endswith(('.mp4', '.mov', '.webm', '.ogg', '.m4v', '.avi')):
                return 'video'
        return 'image'

    def get_image_url(self, obj):
        if obj.image and obj.image.name:
            try:
                return obj.image.url
            except Exception:
                pass
        cat = (obj.category or '').lower()
        if 'brownie' in cat:
            return '/poster-classic-brownies.jpg'
        if 'cake' in cat or 'banana' in cat:
            return '/poster-banana-cake.jpg'
        return '/poster-choco-chip.jpg'

class CustomerReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerReview
        fields = [
            'id', 'customer_name', 'customer_location', 'product_name',
            'rating', 'comment', 'is_approved', 'created_at'
        ]

class CustomerPaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)
    order_number = serializers.CharField(source='order.inquiry_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer_name', read_only=True)

    class Meta:
        model = CustomerPayment
        fields = [
            'id', 'order', 'order_number', 'customer', 'customer_name',
            'payment_date', 'amount', 'payment_method', 'reference_number',
            'notes', 'recorded_by_name', 'created_at'
        ]

class CustomerSerializer(serializers.ModelSerializer):
    total_orders = serializers.IntegerField(read_only=True)
    total_ordered_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_outstanding_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    qualifying_orders_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'email', 'address', 'notes',
            'loyalty_card_number', 'loyalty_stamps', 'manual_stamp_adjustment',
            'rewards_redeemed', 'reward_notes', 'qualifying_orders_count',
            'total_orders', 'total_ordered_amount', 'total_paid_amount',
            'total_outstanding_balance', 'created_at', 'updated_at'
        ]

class CustomerInquirySerializer(serializers.ModelSerializer):
    payments = CustomerPaymentSerializer(many=True, read_only=True)
    customer_details = CustomerSerializer(source='customer', read_only=True)

    class Meta:
        model = CustomerInquiry
        fields = [
            'id', 'inquiry_number', 'shared_order_number', 'customer', 'customer_details',
            'customer_name', 'customer_phone', 'order_type', 'delivery_method',
            'delivery_address', 'special_instructions', 'target_date',
            'items_summary', 'items_json', 'estimated_total', 'notes', 'status',
            'payment_type', 'initial_deposit', 'amount_paid', 'remaining_balance',
            'payment_due_date', 'payment_status', 'payment_notes',
            'converted_sale', 'payments', 'created_at', 'updated_at'
        ]

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    variant_name = serializers.CharField(source='product_variant.name', read_only=True)
    display_name = serializers.CharField(source='product_variant.display_name', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id', 'product_variant', 'product_name', 'variant_name', 'display_name',
            'quantity', 'selling_price', 'discount', 'total_price',
            'historical_unit_cost', 'gross_profit'
        ]

class SaleOrderSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = SaleOrder
        fields = [
            'id', 'receipt_number', 'sale_date', 'customer_name', 'customer', 'payment_method',
            'subtotal', 'discount', 'total_sales', 'total_cogs', 'gross_profit',
            'notes', 'items', 'created_by_name', 'created_at'
        ]

