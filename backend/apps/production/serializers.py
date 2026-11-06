from rest_framework import serializers
from .models import ProductionOrder, ProductionIngredientUsage

class ProductionIngredientUsageSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)

    class Meta:
        model = ProductionIngredientUsage
        fields = [
            'id', 'ingredient', 'ingredient_name', 'required_quantity',
            'actual_quantity_used', 'unit', 'unit_cost_snapshot', 'total_cost'
        ]

class ProductionOrderSerializer(serializers.ModelSerializer):
    recipe_name = serializers.CharField(source='recipe.name', read_only=True)
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    variant_name = serializers.CharField(source='product_variant.name', read_only=True)
    ingredient_usages = ProductionIngredientUsageSerializer(many=True, read_only=True)

    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'production_number', 'recipe', 'recipe_name', 'product_variant',
            'product_name', 'variant_name', 'production_date', 'batches_count',
            'planned_yield', 'actual_yield', 'status', 'total_production_cost',
            'cost_per_unit', 'notes', 'ingredient_usages', 'created_by',
            'created_at', 'completed_at'
        ]

