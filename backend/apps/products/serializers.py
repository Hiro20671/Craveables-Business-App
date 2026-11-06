from rest_framework import serializers
from .models import Category, Product, ProductVariant

class ProductVariantSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    cost_per_unit = serializers.SerializerMethodField()
    profit_margin = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product', 'product_name', 'category_name', 'name', 'sku',
            'selling_price', 'batch_yield', 'current_finished_stock',
            'is_active', 'cost_per_unit', 'profit_margin', 'created_at'
        ]

    def get_cost_per_unit(self, obj):
        if hasattr(obj, 'recipe') and obj.recipe:
            return round(obj.recipe.calculated_cost_per_unit, 2)
        return 0.00

    def get_profit_margin(self, obj):
        if hasattr(obj, 'recipe') and obj.recipe and obj.selling_price > 0:
            cost = obj.recipe.calculated_cost_per_unit
            profit = float(obj.selling_price) - float(cost)
            return round((profit / float(obj.selling_price)) * 100, 2)
        return 0.00

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'category_name', 'description',
            'image', 'image_url', 'status', 'variants', 'created_at', 'updated_at'
        ]

class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'products_count', 'created_at']

