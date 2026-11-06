from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from decimal import Decimal
from .models import SaleOrder, SaleItem, PaymentMethod, CustomerInquiry, InquiryStatus, CustomerReview
from .serializers import SaleOrderSerializer, SaleItemSerializer, CustomerInquirySerializer, CustomerReviewSerializer
from apps.products.models import ProductVariant

class SaleOrderViewSet(viewsets.ModelViewSet):
    queryset = SaleOrder.objects.all().prefetch_related(
        'items__product_variant__product'
    ).order_by('-sale_date', '-id')
    serializer_class = SaleOrderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        payment_method = self.request.query_params.get('payment_method')
        search = self.request.query_params.get('search')

        if start_date:
            qs = qs.filter(sale_date__gte=start_date)
        if end_date:
            qs = qs.filter(sale_date__lte=end_date)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        if search:
            qs = qs.filter(receipt_number__icontains=search) | qs.filter(customer_name__icontains=search)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        sale_date = data.get('sale_date', timezone.now().date())
        receipt_number = data.get('receipt_number') or f"CRV-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        customer_name = data.get('customer_name', '')
        payment_method = data.get('payment_method', PaymentMethod.CASH)
        notes = data.get('notes', '')
        items_data = data.get('items', [])

        if not items_data:
            return Response({'detail': 'Sale items are required.'}, status=status.HTTP_400_BAD_REQUEST)

        order_discount = Decimal(str(data.get('discount', '0.00')))

        order = SaleOrder.objects.create(
            receipt_number=receipt_number,
            sale_date=sale_date,
            customer_name=customer_name,
            payment_method=payment_method,
            discount=order_discount,
            notes=notes,
            created_by=request.user if request.user.is_authenticated else None
        )

        total_subtotal = Decimal('0.00')
        total_items_discount = Decimal('0.00')
        total_cogs = Decimal('0.00')

        for item_info in items_data:
            variant_id = item_info['product_variant']
            variant = ProductVariant.objects.get(id=variant_id)
            qty = int(item_info.get('quantity', 1))
            selling_price = Decimal(str(item_info.get('selling_price', variant.selling_price)))
            item_discount = Decimal(str(item_info.get('discount', '0.00')))

            # Get historical unit cost from recipe
            if hasattr(variant, 'recipe') and variant.recipe:
                unit_cost = variant.recipe.calculated_cost_per_unit
            else:
                unit_cost = Decimal('0.0000')

            item_total = (selling_price * Decimal(str(qty))) - item_discount
            item_cost = unit_cost * Decimal(str(qty))

            total_subtotal += (selling_price * Decimal(str(qty)))
            total_items_discount += item_discount
            total_cogs += item_cost

            SaleItem.objects.create(
                sale_order=order,
                product_variant=variant,
                quantity=qty,
                selling_price=selling_price,
                discount=item_discount,
                historical_unit_cost=unit_cost
            )

            # Deduct from finished goods inventory if in stock (does NOT re-deduct raw ingredients!)
            if variant.current_finished_stock >= qty:
                variant.current_finished_stock -= qty
                variant.save()

        combined_discount = total_items_discount + order_discount
        order.subtotal = total_subtotal
        order.discount = combined_discount
        order.total_sales = max(Decimal('0.00'), total_subtotal - combined_discount)
        order.total_cogs = total_cogs
        order.gross_profit = order.total_sales - total_cogs
        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        # Restore finished stock when sale order is deleted/undone
        for item in order.items.all():
            variant = item.product_variant
            variant.current_finished_stock += item.quantity
            variant.save()
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='cancel')
    @transaction.atomic
    def cancel_sale(self, request, pk=None):
        order = self.get_object()
        # Restore finished stock
        for item in order.items.all():
            variant = item.product_variant
            variant.current_finished_stock += item.quantity
            variant.save()
        # Delete or zero out
        order_num = order.receipt_number
        order.delete()
        return Response({'detail': f'Sale order {order_num} has been undone and stock restored.'})

    @action(detail=False, methods=['get'], url_path='summary')
    def summary_metrics(self, request):
        qs = self.get_queryset()
        totals = qs.aggregate(
            total_sales=Sum('total_sales'),
            total_gross_profit=Sum('gross_profit'),
            total_cogs=Sum('total_cogs'),
            orders_count=Count('id'),
            avg_sale=Avg('total_sales')
        )
        total_units = SaleItem.objects.filter(sale_order__in=qs).aggregate(units=Sum('quantity'))['units'] or 0

        return Response({
            'total_sales': totals['total_sales'] or 0.00,
            'total_gross_profit': totals['total_gross_profit'] or 0.00,
            'total_cogs': totals['total_cogs'] or 0.00,
            'orders_count': totals['orders_count'] or 0,
            'average_sale': round(totals['avg_sale'] or 0.00, 2),
            'total_units_sold': total_units,
        })

class CustomerInquiryViewSet(viewsets.ModelViewSet):
    queryset = CustomerInquiry.objects.all().order_by('-created_at')
    serializer_class = CustomerInquirySerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        data = request.data
        inquiry_number = f"INQ-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        customer_name = data.get('customer_name', '').strip() or 'Customer'
        customer_phone = data.get('customer_phone', '').strip()
        target_date = data.get('target_date') or None
        items_summary = data.get('items_summary', '')
        items_json = data.get('items_json', [])
        estimated_total = Decimal(str(data.get('estimated_total', '0.00')))
        notes = data.get('notes', '')

        inquiry = CustomerInquiry.objects.create(
            inquiry_number=inquiry_number,
            customer_name=customer_name,
            customer_phone=customer_phone,
            target_date=target_date,
            items_summary=items_summary,
            items_json=items_json,
            estimated_total=estimated_total,
            notes=notes,
            status=InquiryStatus.PENDING
        )
        serializer = self.get_serializer(inquiry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        inquiry = self.get_object()
        new_status = request.data.get('status')
        if new_status in InquiryStatus.values:
            inquiry.status = new_status
            inquiry.save()
            return Response(self.get_serializer(inquiry).data)
        return Response({'detail': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='convert-to-sale')
    @transaction.atomic
    def convert_to_sale(self, request, pk=None):
        inquiry = self.get_object()
        if inquiry.converted_sale:
            return Response({'detail': 'This inquiry has already been converted to a sale.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = request.data.get('payment_method', PaymentMethod.GCASH)
        notes = f"Converted from Online Order Inquiry {inquiry.inquiry_number}. {inquiry.notes}".strip()

        sale_order = SaleOrder.objects.create(
            receipt_number=f"CRV-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            sale_date=timezone.now().date(),
            customer_name=inquiry.customer_name,
            payment_method=payment_method,
            subtotal=inquiry.estimated_total,
            discount=Decimal('0.00'),
            total_sales=inquiry.estimated_total,
            total_cogs=Decimal('0.00'),
            gross_profit=inquiry.estimated_total,
            notes=notes,
            created_by=request.user if request.user.is_authenticated else None
        )

        # Link converted sale
        inquiry.converted_sale = sale_order
        inquiry.status = InquiryStatus.COMPLETED
        inquiry.save()

        return Response({
            'inquiry': self.get_serializer(inquiry).data,
            'sale_order_id': sale_order.id,
            'receipt_number': sale_order.receipt_number
        })

class CustomerReviewViewSet(viewsets.ModelViewSet):
    queryset = CustomerReview.objects.all().order_by('-created_at')
    serializer_class = CustomerReviewSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ['approve', 'reject', 'retrieve', 'update', 'partial_update', 'destroy']:
            return qs
        include_all = self.request.query_params.get('all') == 'true'
        if not self.request.user.is_authenticated and not include_all:
            return qs.filter(is_approved=True)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data
        customer_name = data.get('customer_name', '').strip() or 'Customer'
        customer_location = data.get('customer_location', '').strip()
        product_name = data.get('product_name', '').strip()
        try:
            rating = max(1, min(5, int(data.get('rating', 5))))
        except (ValueError, TypeError):
            rating = 5
        comment = data.get('comment', '').strip()
        if not comment:
            return Response({'detail': 'Review comment is required.'}, status=status.HTTP_400_BAD_REQUEST)

        review = CustomerReview.objects.create(
            customer_name=customer_name,
            customer_location=customer_location,
            product_name=product_name,
            rating=rating,
            comment=comment,
            is_approved=False
        )
        return Response(self.get_serializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        review = self.get_object()
        review.is_approved = True
        review.save()
        return Response(self.get_serializer(review).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        review = self.get_object()
        review.is_approved = False
        review.save()
        return Response(self.get_serializer(review).data)


