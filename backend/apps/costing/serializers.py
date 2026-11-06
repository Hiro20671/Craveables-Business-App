from rest_framework import serializers
from .models import PackagingItem, Recipe, RecipeIngredient, RecipePackaging

class PackagingItemSerializer(serializers.ModelSerializer):
    cost_per_need = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)

    class Meta:
        model = PackagingItem
        fields = ['id', 'name', 'cost', 'quantity', 'cost_per_unit', 'default_needed_per_batch', 'cost_per_need', 'created_at']

class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    ingredient_current_stock = serializers.DecimalField(source='ingredient.current_stock', max_digits=12, decimal_places=2, read_only=True)
    ingredient_stock_status = serializers.CharField(source='ingredient.stock_status', read_only=True)
    cost_per_unit = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    ingredient_cost = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)

    class Meta:
        model = RecipeIngredient
        fields = [
            'id', 'ingredient', 'ingredient_name', 'ingredient_current_stock', 'ingredient_stock_status',
            'quantity_used', 'unit', 'cost_per_unit', 'ingredient_cost', 'notes'
        ]

class RecipePackagingSerializer(serializers.ModelSerializer):
    packaging_item_name = serializers.CharField(source='packaging_item.name', read_only=True)
    cost_per_unit = serializers.DecimalField(source='packaging_item.cost_per_unit', max_digits=10, decimal_places=4, read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)

    class Meta:
        model = RecipePackaging
        fields = ['id', 'packaging_item', 'packaging_item_name', 'cost_per_unit', 'quantity_needed', 'total_cost']

class RecipeSerializer(serializers.ModelSerializer):
    variant_name = serializers.CharField(source='product_variant.name', read_only=True)
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    category_name = serializers.CharField(source='product_variant.product.category.name', read_only=True)
    selling_price = serializers.DecimalField(source='product_variant.selling_price', max_digits=10, decimal_places=2, read_only=True)
    recipe_ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    recipe_packagings = RecipePackagingSerializer(many=True, read_only=True)

    total_ingredient_cost = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    calculated_packaging_cost = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    total_overhead_cost = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    total_batch_cost = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    calculated_cost_per_unit = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    profit_per_unit = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    profit_margin = serializers.FloatField(read_only=True)
    profit_margin_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = Recipe
        fields = [
            'id', 'product_variant', 'variant_name', 'product_name', 'category_name',
            'name', 'batch_yield', 'batch_size_desc', 'packaging_cost', 'shipping_cost',
            'electricity_cost', 'labor_cost', 'selling_price', 'total_ingredient_cost',
            'calculated_packaging_cost', 'total_overhead_cost', 'total_batch_cost',
            'calculated_cost_per_unit', 'profit_per_unit', 'profit_margin',
            'profit_margin_percentage', 'notes', 'recipe_ingredients',
            'recipe_packagings', 'created_at', 'updated_at'
        ]

