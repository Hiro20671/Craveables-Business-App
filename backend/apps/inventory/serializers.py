from rest_framework import serializers
from .models import Ingredient, StockTransaction

class IngredientSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    stock_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    stock_status = serializers.CharField(read_only=True)

    class Meta:
        model = Ingredient
        fields = [
            'id', 'name', 'supplier', 'supplier_name', 'supplier_name_raw',
            'purchase_date', 'purchase_cost', 'package_size', 'unit',
            'cost_per_unit', 'current_stock', 'minimum_stock_level',
            'reorder_level', 'stock_value', 'stock_status', 'notes',
            'created_at', 'updated_at'
        ]

class StockTransactionSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    unit = serializers.CharField(source='ingredient.unit', read_only=True)
    user_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockTransaction
        fields = [
            'id', 'ingredient', 'ingredient_name', 'unit', 'transaction_type',
            'quantity_change', 'previous_stock', 'new_stock', 'reason',
            'reference_id', 'created_by', 'user_name', 'created_at'
        ]

