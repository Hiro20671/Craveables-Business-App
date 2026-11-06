from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from .models import Supplier, PurchaseOrder, PurchaseItem, PurchaseOrderStatus
from .serializers import SupplierSerializer, PurchaseOrderSerializer
from apps.inventory.models import Ingredient, StockTransaction, TransactionType

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().select_related('supplier').prefetch_related('items__ingredient').order_by('-purchase_date', '-id')
    serializer_class = PurchaseOrderSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        supplier_id = data.get('supplier')
        supplier = Supplier.objects.get(id=supplier_id)
        purchase_date = data.get('purchase_date', timezone.now().date())
        po_number = data.get('po_number') or f"PO-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        payment_method = data.get('payment_method', 'Cash')
        notes = data.get('notes', '')
        items_data = data.get('items', [])

        total_amount = sum(float(item.get('total_cost', 0)) for item in items_data)

        po = PurchaseOrder.objects.create(
            po_number=po_number,
            supplier=supplier,
            purchase_date=purchase_date,
            status=PurchaseOrderStatus.RECEIVED,
            total_amount=total_amount,
            payment_method=payment_method,
            notes=notes,
            created_by=request.user if request.user.is_authenticated else None
        )

        for item_info in items_data:
            ingredient = Ingredient.objects.get(id=item_info['ingredient'])
            package_size = float(item_info.get('package_size', ingredient.package_size))
            unit = item_info.get('unit', ingredient.unit)
            qty_packages = float(item_info.get('quantity_packages', 1))
            pkg_cost = float(item_info.get('package_cost', ingredient.purchase_cost))
            total_qty = package_size * qty_packages
            item_total_cost = pkg_cost * qty_packages

            PurchaseItem.objects.create(
                purchase_order=po,
                ingredient=ingredient,
                package_size=package_size,
                unit=unit,
                quantity_packages=qty_packages,
                total_quantity=total_qty,
                package_cost=pkg_cost,
                total_cost=item_total_cost
            )

            # Automatically increase ingredient stock & update latest cost
            prev_stock = ingredient.current_stock
            ingredient.current_stock += total_qty
            ingredient.purchase_cost = pkg_cost
            ingredient.package_size = package_size
            if package_size > 0:
                ingredient.cost_per_unit = round(pkg_cost / package_size, 4)
            ingredient.save()

            StockTransaction.objects.create(
                ingredient=ingredient,
                transaction_type=TransactionType.PURCHASE,
                quantity_change=total_qty,
                previous_stock=prev_stock,
                new_stock=ingredient.current_stock,
                reason=f"Purchase order {po.po_number} from {supplier.name}",
                reference_id=po.po_number,
                created_by=request.user if request.user.is_authenticated else None
            )

        serializer = self.get_serializer(po)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

