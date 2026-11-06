from rest_framework import serializers
from .models import SaleOrder, SaleItem, CustomerInquiry, CustomerReview

class CustomerReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerReview
        fields = [
            'id', 'customer_name', 'customer_location', 'product_name',
            'rating', 'comment', 'is_approved', 'created_at'
        ]

class CustomerInquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerInquiry
        fields = [
            'id', 'inquiry_number', 'customer_name', 'customer_phone',
            'target_date', 'items_summary', 'items_json', 'estimated_total',
            'notes', 'status', 'converted_sale', 'created_at', 'updated_at'
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
            'id', 'receipt_number', 'sale_date', 'customer_name', 'payment_method',
            'subtotal', 'discount', 'total_sales', 'total_cogs', 'gross_profit',
            'notes', 'items', 'created_by_name', 'created_at'
        ]

