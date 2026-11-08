from rest_framework import serializers
from .models import ProductionOrder, ProductionIngredientUsage

class ProductionIngredientUsageSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    current_stock = serializers.DecimalField(source='ingredient.current_stock', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ProductionIngredientUsage
        fields = [
            'id', 'ingredient', 'ingredient_name', 'current_stock',
            'required_quantity', 'actual_quantity_used', 'original_recipe_quantity',
            'is_additional', 'unit', 'unit_cost_snapshot', 'total_cost', 'notes'
        ]

class ProductionOrderSerializer(serializers.ModelSerializer):
    recipe_name = serializers.CharField(source='recipe.name', read_only=True)
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    variant_name = serializers.CharField(source='product_variant.name', read_only=True)
    ingredient_usages = ProductionIngredientUsageSerializer(many=True, read_only=True)
    adjusted_by_name = serializers.CharField(source='adjusted_by.username', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'production_number', 'order_number_ref', 'customer_inquiry',
            'recipe', 'recipe_name', 'product_variant', 'product_name',
            'variant_name', 'production_date', 'batches_count', 'planned_yield',
            'actual_yield', 'status', 'is_customized', 'adjustment_reason',
            'adjusted_by', 'adjusted_by_name', 'total_production_cost',
            'cost_per_unit', 'notes', 'ingredient_usages', 'created_by',
            'created_by_name', 'created_at', 'completed_at'
        ]

