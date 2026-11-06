from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from decimal import Decimal
from .models import PackagingItem, Recipe, RecipeIngredient, RecipePackaging
from .serializers import (
    PackagingItemSerializer, RecipeSerializer,
    RecipeIngredientSerializer, RecipePackagingSerializer
)
from apps.products.models import ProductVariant

class PackagingItemViewSet(viewsets.ModelViewSet):
    queryset = PackagingItem.objects.all().order_by('name')
    serializer_class = PackagingItemSerializer

class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all().select_related(
        'product_variant', 'product_variant__product', 'product_variant__product__category'
    ).prefetch_related(
        'recipe_ingredients__ingredient', 'recipe_packagings__packaging_item'
    ).order_by('name')
    serializer_class = RecipeSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        variant_id = data.get('product_variant')
        variant = ProductVariant.objects.get(id=variant_id)

        # Check if variant already has recipe
        if hasattr(variant, 'recipe') and variant.recipe:
            return Response({'detail': 'A recipe already exists for this variant.'}, status=status.HTTP_400_BAD_REQUEST)

        recipe = Recipe.objects.create(
            product_variant=variant,
            name=data.get('name', f"{variant.product.name} — {variant.name}"),
            batch_yield=int(data.get('batch_yield', variant.batch_yield or 1)),
            batch_size_desc=data.get('batch_size_desc', ''),
            packaging_cost=Decimal(str(data.get('packaging_cost', '0'))),
            shipping_cost=Decimal(str(data.get('shipping_cost', '0'))),
            electricity_cost=Decimal(str(data.get('electricity_cost', '70.00'))),
            labor_cost=Decimal(str(data.get('labor_cost', '50.00'))),
            notes=data.get('notes', '')
        )

        # Add ingredients
        for ing_data in data.get('recipe_ingredients', []):
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient_id=ing_data['ingredient'],
                quantity_used=Decimal(str(ing_data['quantity_used'])),
                unit=ing_data.get('unit', 'g'),
                notes=ing_data.get('notes', '')
            )

        # Add packaging items
        for p_data in data.get('recipe_packagings', []):
            RecipePackaging.objects.create(
                recipe=recipe,
                packaging_item_id=p_data['packaging_item'],
                quantity_needed=Decimal(str(p_data.get('quantity_needed', '1')))
            )

        serializer = self.get_serializer(recipe)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        recipe = self.get_object()
        data = request.data

        recipe.name = data.get('name', recipe.name)
        recipe.batch_yield = int(data.get('batch_yield', recipe.batch_yield))
        recipe.batch_size_desc = data.get('batch_size_desc', recipe.batch_size_desc)
        recipe.packaging_cost = Decimal(str(data.get('packaging_cost', recipe.packaging_cost)))
        recipe.shipping_cost = Decimal(str(data.get('shipping_cost', recipe.shipping_cost)))
        recipe.electricity_cost = Decimal(str(data.get('electricity_cost', recipe.electricity_cost)))
        recipe.labor_cost = Decimal(str(data.get('labor_cost', recipe.labor_cost)))
        recipe.notes = data.get('notes', recipe.notes)
        recipe.save()

        # Update ingredients if provided
        if 'recipe_ingredients' in data:
            recipe.recipe_ingredients.all().delete()
            for ing_data in data['recipe_ingredients']:
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient_id=ing_data['ingredient'],
                    quantity_used=Decimal(str(ing_data['quantity_used'])),
                    unit=ing_data.get('unit', 'g'),
                    notes=ing_data.get('notes', '')
                )

        # Update packagings if provided
        if 'recipe_packagings' in data:
            recipe.recipe_packagings.all().delete()
            for p_data in data['recipe_packagings']:
                RecipePackaging.objects.create(
                    recipe=recipe,
                    packaging_item_id=p_data['packaging_item'],
                    quantity_needed=Decimal(str(p_data.get('quantity_needed', '1')))
                )

        serializer = self.get_serializer(recipe)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='duplicate')
    @transaction.atomic
    def duplicate_recipe(self, request, pk=None):
        original = self.get_object()
        target_variant_id = request.data.get('target_variant_id')

        if not target_variant_id:
            return Response({'detail': 'target_variant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        target_variant = ProductVariant.objects.get(id=target_variant_id)
        if hasattr(target_variant, 'recipe') and target_variant.recipe:
            return Response({'detail': 'Target variant already has a recipe.'}, status=status.HTTP_400_BAD_REQUEST)

        new_recipe = Recipe.objects.create(
            product_variant=target_variant,
            name=f"{target_variant.product.name} — {target_variant.name}",
            batch_yield=original.batch_yield,
            batch_size_desc=original.batch_size_desc,
            packaging_cost=original.packaging_cost,
            shipping_cost=original.shipping_cost,
            electricity_cost=original.electricity_cost,
            labor_cost=original.labor_cost,
            notes=f"Duplicated from {original.name}"
        )

        for ri in original.recipe_ingredients.all():
            RecipeIngredient.objects.create(
                recipe=new_recipe,
                ingredient=ri.ingredient,
                quantity_used=ri.quantity_used,
                unit=ri.unit,
                notes=ri.notes
            )

        for rp in original.recipe_packagings.all():
            RecipePackaging.objects.create(
                recipe=new_recipe,
                packaging_item=rp.packaging_item,
                quantity_needed=rp.quantity_needed
            )

        return Response(self.get_serializer(new_recipe).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='cost-matrix')
    def cost_matrix(self, request):
        recipes = self.get_queryset()
        matrix = []
        for r in recipes:
            matrix.append({
                'recipe_id': r.id,
                'recipe_name': r.name,
                'product_name': r.product_variant.product.name,
                'variant_name': r.product_variant.name,
                'batch_yield': r.batch_yield,
                'total_ingredient_cost': r.total_ingredient_cost,
                'packaging_cost': r.calculated_packaging_cost,
                'electricity_cost': r.electricity_cost,
                'labor_cost': r.labor_cost,
                'shipping_cost': r.shipping_cost,
                'total_batch_cost': r.total_batch_cost,
                'cost_per_unit': r.calculated_cost_per_unit,
                'selling_price': r.selling_price,
                'profit_per_unit': r.profit_per_unit,
                'profit_margin_percentage': r.profit_margin_percentage
            })
        return Response(matrix)

