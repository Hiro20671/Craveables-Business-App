from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from decimal import Decimal
from .models import Ingredient, StockTransaction, TransactionType
from .serializers import IngredientSerializer, StockTransactionSerializer

class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all().select_related('supplier').order_by('name')
    serializer_class = IngredientSerializer

    @action(detail=True, methods=['post'], url_path='adjust-stock')
    @transaction.atomic
    def adjust_stock(self, request, pk=None):
        ingredient = self.get_object()
        new_quantity = request.data.get('new_stock')
        reason = request.data.get('reason', 'Manual Inventory Adjustment')
        adjustment_type = request.data.get('adjustment_type', TransactionType.MANUAL_ADJUSTMENT)

        if new_quantity is None:
            return Response({'detail': 'New stock quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_stock = Decimal(str(new_quantity))
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid quantity value.'}, status=status.HTTP_400_BAD_REQUEST)

        if target_stock < 0:
            return Response({'detail': 'Stock quantity cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

        prev_stock = ingredient.current_stock
        diff = target_stock - prev_stock

        ingredient.current_stock = target_stock
        ingredient.save()

        StockTransaction.objects.create(
            ingredient=ingredient,
            transaction_type=adjustment_type,
            quantity_change=diff,
            previous_stock=prev_stock,
            new_stock=target_stock,
            reason=reason,
            created_by=request.user if request.user.is_authenticated else None
        )

        return Response(IngredientSerializer(ingredient).data)

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock_alerts(self, request):
        low_stock_items = [
            ing for ing in Ingredient.objects.all().select_related('supplier')
            if ing.stock_status in ['LOW', 'OUT_OF_STOCK']
        ]
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='restocking-list')
    def restocking_list(self, request):
        items = []
        for ing in Ingredient.objects.all().select_related('supplier'):
            if ing.stock_status in ['LOW', 'OUT_OF_STOCK']:
                needed = max(Decimal('0'), (ing.reorder_level * Decimal('2')) - ing.current_stock)
                items.append({
                    'id': ing.id,
                    'name': ing.name,
                    'supplier': ing.supplier.name if ing.supplier else (ing.supplier_name_raw or 'Unassigned'),
                    'current_stock': ing.current_stock,
                    'reorder_level': ing.reorder_level,
                    'unit': ing.unit,
                    'suggested_reorder_qty': needed,
                    'cost_per_unit': ing.cost_per_unit,
                    'estimated_cost': round(needed * ing.cost_per_unit, 2),
                    'status': ing.stock_status
                })
        return Response(items)

class StockTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockTransaction.objects.all().select_related('ingredient', 'created_by').order_by('-created_at')
    serializer_class = StockTransactionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        ingredient_id = self.request.query_params.get('ingredient')
        if ingredient_id:
            qs = qs.filter(ingredient_id=ingredient_id)
        return qs

