from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from .models import ProductionOrder, ProductionIngredientUsage, ProductionStatus
from .serializers import ProductionOrderSerializer
from apps.costing.models import Recipe
from apps.inventory.models import Ingredient, StockTransaction, TransactionType

class ProductionOrderViewSet(viewsets.ModelViewSet):
    queryset = ProductionOrder.objects.all().select_related(
        'recipe', 'product_variant', 'product_variant__product'
    ).prefetch_related('ingredient_usages__ingredient').order_by('-production_date', '-id')
    serializer_class = ProductionOrderSerializer

    @action(detail=False, methods=['post'], url_path='check-requirements')
    def check_requirements(self, request):
        recipe_id = request.data.get('recipe')
        batches = Decimal(str(request.data.get('batches_count', '1')))

        if not recipe_id:
            return Response({'detail': 'Recipe is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipe = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').get(id=recipe_id)
        except Recipe.DoesNotExist:
            return Response({'detail': 'Recipe not found.'}, status=status.HTTP_404_NOT_FOUND)

        requirements = []
        is_sufficient = True

        for ri in recipe.recipe_ingredients.all():
            ing = ri.ingredient
            required_qty = round(ri.quantity_used * batches, 2)
            has_enough = ing.current_stock >= required_qty
            shortage = max(Decimal('0'), required_qty - ing.current_stock)
            if not has_enough:
                is_sufficient = False

            requirements.append({
                'ingredient_id': ing.id,
                'ingredient_name': ing.name,
                'unit': ing.unit,
                'required_quantity': float(required_qty),
                'current_stock': float(ing.current_stock),
                'shortage': float(shortage),
                'has_enough': has_enough,
                'unit_cost': float(ing.cost_per_unit),
                'estimated_cost': float(round(required_qty * ing.cost_per_unit, 2))
            })

        planned_yield = int(recipe.batch_yield * batches)
        est_overhead = float(recipe.total_overhead_cost * batches)
        est_ing_cost = sum(item['estimated_cost'] for item in requirements)
        est_total_cost = est_ing_cost + est_overhead
        cost_per_unit = round(est_total_cost / max(1, planned_yield), 2)

        return Response({
            'recipe_id': recipe.id,
            'recipe_name': recipe.name,
            'batches_count': float(batches),
            'planned_yield': planned_yield,
            'is_sufficient': is_sufficient,
            'requirements': requirements,
            'estimated_ingredient_cost': round(est_ing_cost, 2),
            'estimated_overhead_cost': round(est_overhead, 2),
            'estimated_total_cost': round(est_total_cost, 2),
            'estimated_cost_per_unit': cost_per_unit,
        })

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        recipe_id = data.get('recipe')
        batches = Decimal(str(data.get('batches_count', '1')))
        prod_date = data.get('production_date', timezone.now().date())
        prod_status = data.get('status', ProductionStatus.PLANNED)
        notes = data.get('notes', '')

        recipe = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').get(id=recipe_id)
        variant = recipe.product_variant
        planned_yield = int(recipe.batch_yield * batches)
        actual_yield = int(data.get('actual_yield', planned_yield))

        prod_num = data.get('production_number') or f"PRD-{timezone.now().strftime('%Y%m%d%H%M%S')}"

        # If user chooses to immediately complete, validate stock
        if prod_status == ProductionStatus.COMPLETED:
            for ri in recipe.recipe_ingredients.all():
                ing = Ingredient.objects.select_for_update().get(id=ri.ingredient_id)
                needed = ri.quantity_used * batches
                if ing.current_stock < needed:
                    shortage = needed - ing.current_stock
                    return Response({
                        'detail': f"Insufficient stock for '{ing.name}'. Available: {ing.current_stock}{ing.unit}, Required: {needed}{ing.unit} (Short by {shortage}{ing.unit})."
                    }, status=status.HTTP_400_BAD_REQUEST)

        order = ProductionOrder.objects.create(
            production_number=prod_num,
            recipe=recipe,
            product_variant=variant,
            production_date=prod_date,
            batches_count=batches,
            planned_yield=planned_yield,
            actual_yield=actual_yield,
            status=prod_status,
            notes=notes,
            created_by=request.user if request.user.is_authenticated else None
        )

        # Process ingredient usages & deduction if completed
        total_ing_cost = Decimal('0.00')
        for ri in recipe.recipe_ingredients.all():
            ing = Ingredient.objects.select_for_update().get(id=ri.ingredient_id)
            needed = ri.quantity_used * batches
            unit_cost = ing.cost_per_unit
            usage_cost = needed * unit_cost
            total_ing_cost += usage_cost

            ProductionIngredientUsage.objects.create(
                production_order=order,
                ingredient=ing,
                required_quantity=needed,
                actual_quantity_used=needed,
                unit=ri.unit,
                unit_cost_snapshot=unit_cost,
                total_cost=usage_cost
            )

            if prod_status == ProductionStatus.COMPLETED:
                prev_stock = ing.current_stock
                ing.current_stock -= needed
                ing.save()

                StockTransaction.objects.create(
                    ingredient=ing,
                    transaction_type=TransactionType.PRODUCTION_USAGE,
                    quantity_change=-needed,
                    previous_stock=prev_stock,
                    new_stock=ing.current_stock,
                    reason=f"Production batch {order.production_number} for {variant.display_name}",
                    reference_id=order.production_number,
                    created_by=request.user if request.user.is_authenticated else None
                )

        total_overhead = recipe.total_overhead_cost * batches
        total_cost = total_ing_cost + total_overhead
        cost_per_unit = total_cost / max(1, Decimal(str(actual_yield)))

        order.total_production_cost = total_cost
        order.cost_per_unit = cost_per_unit

        if prod_status == ProductionStatus.COMPLETED:
            order.completed_at = timezone.now()
            # Increase finished goods stock
            variant.current_finished_stock += actual_yield
            variant.save()

        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='complete')
    @transaction.atomic
    def complete_production(self, request, pk=None):
        order = self.get_object()
        if order.status == ProductionStatus.COMPLETED:
            return Response({'detail': 'This production run has already been completed.'}, status=status.HTTP_400_BAD_REQUEST)

        recipe = order.recipe
        batches = order.batches_count

        # Check all ingredients with lock
        for ri in recipe.recipe_ingredients.all():
            ing = Ingredient.objects.select_for_update().get(id=ri.ingredient_id)
            needed = ri.quantity_used * batches
            if ing.current_stock < needed:
                shortage = needed - ing.current_stock
                return Response({
                    'detail': f"Insufficient stock for '{ing.name}'. Available: {ing.current_stock}{ing.unit}, Required: {needed}{ing.unit} (Short by {shortage}{ing.unit})."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Deduct stock
        total_ing_cost = Decimal('0.00')
        order.ingredient_usages.all().delete()

        for ri in recipe.recipe_ingredients.all():
            ing = Ingredient.objects.select_for_update().get(id=ri.ingredient_id)
            needed = ri.quantity_used * batches
            unit_cost = ing.cost_per_unit
            usage_cost = needed * unit_cost
            total_ing_cost += usage_cost

            ProductionIngredientUsage.objects.create(
                production_order=order,
                ingredient=ing,
                required_quantity=needed,
                actual_quantity_used=needed,
                unit=ri.unit,
                unit_cost_snapshot=unit_cost,
                total_cost=usage_cost
            )

            prev_stock = ing.current_stock
            ing.current_stock -= needed
            ing.save()

            StockTransaction.objects.create(
                ingredient=ing,
                transaction_type=TransactionType.PRODUCTION_USAGE,
                quantity_change=-needed,
                previous_stock=prev_stock,
                new_stock=ing.current_stock,
                reason=f"Production {order.production_number} for {order.product_variant.display_name}",
                reference_id=order.production_number,
                created_by=request.user if request.user.is_authenticated else None
            )

        actual_yield = int(request.data.get('actual_yield', order.actual_yield or order.planned_yield))
        total_overhead = recipe.total_overhead_cost * batches
        total_cost = total_ing_cost + total_overhead
        cost_per_unit = total_cost / max(1, Decimal(str(actual_yield)))

        order.status = ProductionStatus.COMPLETED
        order.actual_yield = actual_yield
        order.total_production_cost = total_cost
        order.cost_per_unit = cost_per_unit
        order.completed_at = timezone.now()
        order.save()

        # Update finished stock
        variant = order.product_variant
        variant.current_finished_stock += actual_yield
        variant.save()

        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], url_path='undo')
    @transaction.atomic
    def undo_production(self, request, pk=None):
        order = self.get_object()
        if order.status != ProductionStatus.COMPLETED:
            return Response({'detail': 'Only completed batches can be undone/reverted.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Restore raw ingredient inventory
        for usage in order.ingredient_usages.all():
            ing = usage.ingredient
            prev_stock = ing.current_stock
            ing.current_stock += usage.actual_quantity_used
            ing.save()

            StockTransaction.objects.create(
                ingredient=ing,
                transaction_type=TransactionType.RETURN,
                quantity_change=usage.actual_quantity_used,
                previous_stock=prev_stock,
                new_stock=ing.current_stock,
                reason=f"Undo/Revert batch {order.production_number} - ingredients restored",
                reference_id=order.production_number,
                created_by=request.user if request.user.is_authenticated else None
            )

        # 2. Deduct added finished goods
        variant = order.product_variant
        variant.current_finished_stock = max(0, variant.current_finished_stock - order.actual_yield)
        variant.save()

        # 3. Mark status as CANCELLED
        order.status = ProductionStatus.CANCELLED
        order.notes = f"{order.notes} [UNDONE on {timezone.now().strftime('%Y-%m-%d %H:%M')}]".strip()
        order.save()

        return Response(self.get_serializer(order).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        # If completed, restore ingredients and revert finished goods
        if order.status == ProductionStatus.COMPLETED:
            for usage in order.ingredient_usages.all():
                ing = usage.ingredient
                prev_stock = ing.current_stock
                ing.current_stock += usage.actual_quantity_used
                ing.save()

                StockTransaction.objects.create(
                    ingredient=ing,
                    transaction_type=TransactionType.RETURN,
                    quantity_change=usage.actual_quantity_used,
                    previous_stock=prev_stock,
                    new_stock=ing.current_stock,
                    reason=f"Deleted batch {order.production_number} - ingredients restored",
                    reference_id=order.production_number,
                    created_by=request.user if request.user.is_authenticated else None
                )

            variant = order.product_variant
            variant.current_finished_stock = max(0, variant.current_finished_stock - order.actual_yield)
            variant.save()

        return super().destroy(request, *args, **kwargs)

