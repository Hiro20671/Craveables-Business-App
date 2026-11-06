from rest_framework import serializers
from .models import Supplier, PurchaseOrder, PurchaseItem

class SupplierSerializer(serializers.ModelSerializer):
    purchase_orders_count = serializers.IntegerField(source='purchase_orders.count', read_only=True)

    class Meta:
        model = Supplier
        fields = ['id', 'name', 'contact_person', 'phone', 'email', 'address', 'notes', 'purchase_orders_count', 'created_at']

class PurchaseItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ['id', 'ingredient', 'ingredient_name', 'package_size', 'unit', 'quantity_packages', 'total_quantity', 'package_cost', 'total_cost']

class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    items = PurchaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'po_number', 'supplier', 'supplier_name', 'purchase_date', 'status', 'total_amount', 'payment_method', 'notes', 'items', 'created_at']

