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
        custom_ingredients = request.data.get('custom_ingredients')  # optional list of {ingredient_id, quantity, is_additional, notes}

        if not recipe_id:
            return Response({'detail': 'Recipe is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipe = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').get(id=recipe_id)
        except Recipe.DoesNotExist:
            return Response({'detail': 'Recipe not found.'}, status=status.HTTP_404_NOT_FOUND)

        requirements = []
        is_sufficient = True

        if custom_ingredients and isinstance(custom_ingredients, list) and len(custom_ingredients) > 0:
            # Flexible Production Customization: Evaluate user-adjusted ingredients
            recipe_map = {ri.ingredient_id: ri for ri in recipe.recipe_ingredients.all()}
            for item in custom_ingredients:
                ing_id = item.get('ingredient_id')
                qty = Decimal(str(item.get('quantity', 0)))
                if qty <= 0:
                    continue
                try:
                    ing = Ingredient.objects.get(id=ing_id)
                except Ingredient.DoesNotExist:
                    continue

                orig_ri = recipe_map.get(ing_id)
                orig_qty = float(round(orig_ri.quantity_used * batches, 2)) if orig_ri else 0.0
                has_enough = ing.current_stock >= qty
                shortage = max(Decimal('0'), qty - ing.current_stock)
                if not has_enough:
                    is_sufficient = False

                requirements.append({
                    'ingredient_id': ing.id,
                    'ingredient_name': ing.name,
                    'unit': ing.unit,
                    'required_quantity': float(qty),
                    'original_recipe_quantity': orig_qty,
                    'is_additional': bool(item.get('is_additional', orig_ri is None)),
                    'current_stock': float(ing.current_stock),
                    'shortage': float(shortage),
                    'has_enough': has_enough,
                    'unit_cost': float(ing.cost_per_unit),
                    'estimated_cost': float(round(qty * ing.cost_per_unit, 2)),
                    'notes': item.get('notes', '')
                })
        else:
            # Default to standard Recipe ingredients
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
                    'original_recipe_quantity': float(required_qty),
                    'is_additional': False,
                    'current_stock': float(ing.current_stock),
                    'shortage': float(shortage),
                    'has_enough': has_enough,
                    'unit_cost': float(ing.cost_per_unit),
                    'estimated_cost': float(round(required_qty * ing.cost_per_unit, 2)),
                    'notes': ''
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
            'is_customized': bool(custom_ingredients),
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
        custom_ingredients = data.get('custom_ingredients')  # optional list
        adjustment_reason = data.get('adjustment_reason', '')
        order_number_ref = data.get('order_number_ref', '')
        customer_inquiry_id = data.get('customer_inquiry')

        recipe = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').get(id=recipe_id)
        variant = recipe.product_variant
        planned_yield = int(recipe.batch_yield * batches)
        actual_yield = int(data.get('actual_yield', planned_yield))

        prod_num = data.get('production_number') or f"PRD-{timezone.now().strftime('%Y%m%d%H%M%S')}"

        is_customized = bool(custom_ingredients and len(custom_ingredients) > 0)

        # Prepare list of items to process
        usage_plan = []
        if is_customized:
            recipe_map = {ri.ingredient_id: ri for ri in recipe.recipe_ingredients.all()}
            for item in custom_ingredients:
                ing_id = item.get('ingredient_id')
                qty = Decimal(str(item.get('quantity', 0)))
                if qty <= 0:
                    continue
                ing = Ingredient.objects.select_for_update().get(id=ing_id)
                orig_ri = recipe_map.get(ing_id)
                orig_qty = orig_ri.quantity_used * batches if orig_ri else Decimal('0.00')
                usage_plan.append({
                    'ingredient': ing,
                    'needed': qty,
                    'original_qty': orig_qty,
                    'is_additional': bool(item.get('is_additional', orig_ri is None)),
                    'unit': ing.unit,
                    'unit_cost': ing.cost_per_unit,
                    'notes': item.get('notes', '')
                })
        else:
            for ri in recipe.recipe_ingredients.all():
                ing = Ingredient.objects.select_for_update().get(id=ri.ingredient_id)
                needed = ri.quantity_used * batches
                usage_plan.append({
                    'ingredient': ing,
                    'needed': needed,
                    'original_qty': needed,
                    'is_additional': False,
                    'unit': ri.unit,
                    'unit_cost': ing.cost_per_unit,
                    'notes': ''
                })

        # If user chooses to immediately complete, validate stock
        if prod_status == ProductionStatus.COMPLETED:
            for u in usage_plan:
                if u['ingredient'].current_stock < u['needed']:
                    shortage = u['needed'] - u['ingredient'].current_stock
                    return Response({
                        'detail': f"Insufficient stock for '{u['ingredient'].name}'. Available: {u['ingredient'].current_stock}{u['unit']}, Required: {u['needed']}{u['unit']} (Short by {shortage}{u['unit']})."
                    }, status=status.HTTP_400_BAD_REQUEST)

        order = ProductionOrder.objects.create(
            production_number=prod_num,
            order_number_ref=order_number_ref,
            customer_inquiry_id=customer_inquiry_id if customer_inquiry_id else None,
            recipe=recipe,
            product_variant=variant,
            production_date=prod_date,
            batches_count=batches,
            planned_yield=planned_yield,
            actual_yield=actual_yield,
            status=prod_status,
            is_customized=is_customized,
            adjustment_reason=adjustment_reason,
            adjusted_by=request.user if (is_customized and request.user.is_authenticated) else None,
            notes=notes,
            created_by=request.user if request.user.is_authenticated else None
        )

        total_ing_cost = Decimal('0.00')
        for u in usage_plan:
            ing = u['ingredient']
            needed = u['needed']
            unit_cost = u['unit_cost']
            usage_cost = needed * unit_cost
            total_ing_cost += usage_cost

            ProductionIngredientUsage.objects.create(
                production_order=order,
                ingredient=ing,
                required_quantity=needed,
                actual_quantity_used=needed,
                original_recipe_quantity=u['original_qty'],
                is_additional=u['is_additional'],
                unit=u['unit'],
                unit_cost_snapshot=unit_cost,
                total_cost=usage_cost,
                notes=u['notes']
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
            variant.current_finished_stock += actual_yield
            variant.save()

        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='adjust-ingredients')
    @transaction.atomic
    def adjust_ingredients(self, request, pk=None):
        """Flexible Production Management (Section 4): Modifies batch ingredients without altering original recipe"""
        order = self.get_object()
        if order.status == ProductionStatus.COMPLETED:
            return Response({'detail': 'Cannot customize ingredients on an already completed batch. Please undo the batch first.'}, status=status.HTTP_400_BAD_REQUEST)

        custom_ingredients = request.data.get('custom_ingredients', [])
        adjustment_reason = request.data.get('adjustment_reason', '')
        batches = Decimal(str(request.data.get('batches_count', order.batches_count)))
        recipe = order.recipe

        # Clear existing unconfirmed usages
        order.ingredient_usages.all().delete()

        recipe_map = {ri.ingredient_id: ri for ri in recipe.recipe_ingredients.all()}
        total_ing_cost = Decimal('0.00')

        for item in custom_ingredients:
            ing_id = item.get('ingredient_id')
            qty = Decimal(str(item.get('quantity', 0)))
            if qty <= 0:
                continue
            ing = Ingredient.objects.get(id=ing_id)
            orig_ri = recipe_map.get(ing_id)
            orig_qty = orig_ri.quantity_used * batches if orig_ri else Decimal('0.00')
            unit_cost = ing.cost_per_unit
            usage_cost = qty * unit_cost
            total_ing_cost += usage_cost

            ProductionIngredientUsage.objects.create(
                production_order=order,
                ingredient=ing,
                required_quantity=qty,
                actual_quantity_used=qty,
                original_recipe_quantity=orig_qty,
                is_additional=bool(item.get('is_additional', orig_ri is None)),
                unit=ing.unit,
                unit_cost_snapshot=unit_cost,
                total_cost=usage_cost,
                notes=item.get('notes', '')
            )

        total_overhead = recipe.total_overhead_cost * batches
        total_cost = total_ing_cost + total_overhead
        actual_yield = int(request.data.get('actual_yield', order.actual_yield or order.planned_yield))
        cost_per_unit = total_cost / max(1, Decimal(str(actual_yield)))

        order.batches_count = batches
        order.is_customized = True
        order.adjustment_reason = adjustment_reason
        order.adjusted_by = request.user if request.user.is_authenticated else None
        order.total_production_cost = total_cost
        order.cost_per_unit = cost_per_unit
        order.save()

        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], url_path='complete')
    @transaction.atomic
    def complete_production(self, request, pk=None):
        order = self.get_object()
        if order.status == ProductionStatus.COMPLETED:
            return Response({'detail': 'This production run has already been completed.'}, status=status.HTTP_400_BAD_REQUEST)

        recipe = order.recipe
        batches = order.batches_count

        # Use customized ingredient usages if already established, otherwise build from recipe
        if order.is_customized and order.ingredient_usages.exists():
            items_to_deduct = []
            for usage in order.ingredient_usages.all():
                ing = Ingredient.objects.select_for_update().get(id=usage.ingredient_id)
                needed = usage.required_quantity
                if ing.current_stock < needed:
                    shortage = needed - ing.current_stock
                    return Response({
                        'detail': f"Insufficient stock for '{ing.name}'. Available: {ing.current_stock}{ing.unit}, Required: {needed}{ing.unit} (Short by {shortage}{ing.unit})."
                    }, status=status.HTTP_400_BAD_REQUEST)
                items_to_deduct.append((usage, ing, needed))

            total_ing_cost = Decimal('0.00')
            for usage, ing, needed in items_to_deduct:
                prev_stock = ing.current_stock
                ing.current_stock -= needed
                ing.save()

                usage.actual_quantity_used = needed
                usage.unit_cost_snapshot = ing.cost_per_unit
                usage.total_cost = needed * ing.cost_per_unit
                usage.save()
                total_ing_cost += usage.total_cost

                StockTransaction.objects.create(
                    ingredient=ing,
                    transaction_type=TransactionType.PRODUCTION_USAGE,
                    quantity_change=-needed,
                    previous_stock=prev_stock,
                    new_stock=ing.current_stock,
                    reason=f"Production {order.production_number} for {order.product_variant.display_name} (Custom Recipe)",
                    reference_id=order.production_number,
                    created_by=request.user if request.user.is_authenticated else None
                )
        else:
            # Check all recipe ingredients with lock
            for ri in recipe.recipe_ingredients.all():
                ing = Ingredient.objects.select_for_update().get(id=ri.ingredient_id)
                needed = ri.quantity_used * batches
                if ing.current_stock < needed:
                    shortage = needed - ing.current_stock
                    return Response({
                        'detail': f"Insufficient stock for '{ing.name}'. Available: {ing.current_stock}{ing.unit}, Required: {needed}{ing.unit} (Short by {shortage}{ing.unit})."
                    }, status=status.HTTP_400_BAD_REQUEST)

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
                    original_recipe_quantity=needed,
                    is_additional=False,
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

