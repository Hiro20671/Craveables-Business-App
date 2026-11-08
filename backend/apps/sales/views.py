import io
import math
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum, Count, Avg, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from .models import (
    SaleOrder, SaleItem, PaymentMethod, CustomerInquiry, InquiryStatus,
    CustomerReview, Customer, CustomerPayment, PaymentStatus, FeaturedOrder
)
from .serializers import (
    SaleOrderSerializer, SaleItemSerializer, CustomerInquirySerializer,
    CustomerReviewSerializer, CustomerSerializer, CustomerPaymentSerializer,
    FeaturedOrderSerializer
)
from apps.products.models import ProductVariant
from apps.costing.models import Recipe
from apps.production.models import ProductionOrder, ProductionStatus


def generate_receipt_pdf(sale_order):
    """Generates official CRAVEABLES branded printable PDF receipt for completed sales."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=48, leftMargin=48, topMargin=36, bottomMargin=36)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#3B170B'),
        alignment=1,
        spaceAfter=3
    )
    subtitle_style = ParagraphStyle(
        'ReceiptSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#A97845'),
        alignment=1,
        spaceAfter=10
    )
    meta_style = ParagraphStyle(
        'ReceiptMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#17110D'),
        spaceAfter=3
    )

    elements.append(Paragraph("CRAVEABLES", title_style))
    elements.append(Paragraph("MADE TO CRAVE • BAKED WITH LOVE", subtitle_style))
    elements.append(Paragraph("Lucena City, Quezon • Small-Batch Artisanal Bakery", ParagraphStyle('Address', parent=styles['Normal'], fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#786055'), alignment=1, spaceAfter=8)))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E9D8B8'), spaceBefore=2, spaceAfter=10))

    elements.append(Paragraph(f"<b>Official Sales Receipt:</b> {sale_order.receipt_number}", meta_style))
    elements.append(Paragraph(f"<b>Date:</b> {sale_order.sale_date.strftime('%B %d, %Y') if hasattr(sale_order.sale_date, 'strftime') else str(sale_order.sale_date)}", meta_style))
    elements.append(Paragraph(f"<b>Customer:</b> {sale_order.customer_name or 'Valued Customer'}", meta_style))
    elements.append(Paragraph(f"<b>Payment Method:</b> {sale_order.payment_method}", meta_style))
    elements.append(Spacer(1, 8))

    items_table_data = [['Item Description', 'Qty', 'Unit Price', 'Total']]
    for item in sale_order.items.all():
        items_table_data.append([
            item.product_variant.display_name if item.product_variant else 'Bake Item',
            str(item.quantity),
            f"₱{float(item.selling_price):,.2f}",
            f"₱{float(item.total_price):,.2f}"
        ])

    if not sale_order.items.exists():
        items_table_data.append([sale_order.notes or 'Completed Order Items', '1', f"₱{float(sale_order.total_sales):,.2f}", f"₱{float(sale_order.total_sales):,.2f}"])

    t = Table(items_table_data, colWidths=[280, 50, 90, 96])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B170B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E9D8B8')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 10))

    summary_data = [
        ['Subtotal:', f"₱{float(sale_order.subtotal):,.2f}"],
        ['Discount / Savings:', f"-₱{float(sale_order.discount):,.2f}" if sale_order.discount > 0 else "₱0.00"],
        ['Total Amount Paid:', f"₱{float(sale_order.total_sales):,.2f}"],
    ]
    t_sum = Table(summary_data, colWidths=[350, 166])
    t_sum.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#3B170B')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FFF9DF')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_sum)
    elements.append(Spacer(1, 20))

    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E9D8B8'), spaceBefore=6, spaceAfter=8))
    elements.append(Paragraph("Thank you for craving with us! Baked fresh with love by Dyna, Jeremy & Anne.", ParagraphStyle('Thanks', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=9, textColor=colors.HexColor('#A97845'), alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="CRAVEABLES-Receipt-{sale_order.receipt_number}.pdf"'
    return response


def generate_inquiry_receipt_pdf(inquiry):
    """Generates official CRAVEABLES branded printable PDF receipt/invoice for customer orders."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=48, leftMargin=48, topMargin=36, bottomMargin=36)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#3B170B'),
        alignment=1,
        spaceAfter=3
    )
    subtitle_style = ParagraphStyle(
        'ReceiptSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#A97845'),
        alignment=1,
        spaceAfter=10
    )
    meta_style = ParagraphStyle(
        'ReceiptMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#17110D'),
        spaceAfter=3
    )

    elements.append(Paragraph("CRAVEABLES", title_style))
    elements.append(Paragraph("MADE TO CRAVE • BAKED WITH LOVE", subtitle_style))
    elements.append(Paragraph("Lucena City, Quezon • Small-Batch Artisanal Bakery", ParagraphStyle('Address', parent=styles['Normal'], fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#786055'), alignment=1, spaceAfter=8)))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E9D8B8'), spaceBefore=2, spaceAfter=10))

    order_num = inquiry.shared_order_number or inquiry.inquiry_number
    elements.append(Paragraph(f"<b>Customer Order &amp; Receipt:</b> {order_num}", meta_style))
    elements.append(Paragraph(f"<b>Target / Fulfillment Date:</b> {inquiry.target_date.strftime('%B %d, %Y') if inquiry.target_date else 'Immediate'}", meta_style))
    elements.append(Paragraph(f"<b>Customer:</b> {inquiry.customer_name} ({inquiry.customer_phone})", meta_style))
    if inquiry.delivery_address:
        elements.append(Paragraph(f"<b>Delivery Address:</b> {inquiry.delivery_address}", meta_style))
    elements.append(Spacer(1, 8))

    items_table_data = [['Item Description', 'Qty', 'Price', 'Total']]
    if inquiry.items_json:
        for itm in inquiry.items_json:
            qty = int(itm.get('qty', 1))
            prc = float(itm.get('price', 0))
            items_table_data.append([
                itm.get('name', 'Bake Item'),
                str(qty),
                f"₱{prc:,.2f}",
                f"₱{(qty * prc):,.2f}"
            ])
    else:
        items_table_data.append([inquiry.items_summary or 'Assorted Bakes', '1', f"₱{float(inquiry.estimated_total):,.2f}", f"₱{float(inquiry.estimated_total):,.2f}"])

    t = Table(items_table_data, colWidths=[280, 50, 90, 96])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B170B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E9D8B8')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 10))

    summary_data = [
        ['Order Total:', f"₱{float(inquiry.estimated_total):,.2f}"],
        ['Amount Paid / Deposit:', f"₱{float(inquiry.amount_paid or 0):,.2f}"],
        ['Remaining Balance Due:', f"₱{float(inquiry.remaining_balance or 0):,.2f}"],
        ['Payment Status:', inquiry.payment_status],
    ]
    t_sum = Table(summary_data, colWidths=[350, 166])
    t_sum.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#3B170B')),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FFF9DF')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_sum)
    elements.append(Spacer(1, 20))

    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E9D8B8'), spaceBefore=6, spaceAfter=8))
    elements.append(Paragraph("Thank you for choosing CRAVEABLES! Baked fresh with love by Dyna, Jeremy & Anne.", ParagraphStyle('Thanks', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=9, textColor=colors.HexColor('#A97845'), alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="CRAVEABLES-Order-{order_num}.pdf"'
    return response


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )
        return qs

    @action(detail=True, methods=['get'], url_path='history')
    def customer_history(self, request, pk=None):
        customer = self.get_object()
        orders = customer.orders.all().order_by('-created_at')
        payments = customer.payments.all().order_by('-payment_date', '-id')
        return Response({
            'customer': CustomerSerializer(customer).data,
            'orders': CustomerInquirySerializer(orders, many=True).data,
            'payments': CustomerPaymentSerializer(payments, many=True).data,
        })


class CustomerPaymentViewSet(viewsets.ModelViewSet):
    queryset = CustomerPayment.objects.all().select_related('order', 'customer', 'recorded_by').order_by('-payment_date', '-id')
    serializer_class = CustomerPaymentSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        order_id = data.get('order')
        if not order_id:
            return Response({'detail': 'Order reference is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = CustomerInquiry.objects.select_for_update().get(id=order_id)
        except CustomerInquiry.DoesNotExist:
            return Response({'detail': 'Customer order not found.'}, status=status.HTTP_404_NOT_FOUND)

        amount = Decimal(str(data.get('amount', '0.00')))
        if amount <= 0:
            return Response({'detail': 'Payment amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = data.get('payment_method', PaymentMethod.CASH)
        reference_number = data.get('reference_number', '')
        payment_date = data.get('payment_date') or timezone.now().date()
        notes = data.get('notes', '')

        payment = CustomerPayment.objects.create(
            order=order,
            customer=order.customer,
            payment_date=payment_date,
            amount=amount,
            payment_method=payment_method,
            reference_number=reference_number,
            notes=notes,
            recorded_by=request.user if request.user.is_authenticated else None
        )

        order.amount_paid = (order.amount_paid or Decimal('0.00')) + amount
        order.save()

        if order.converted_sale:
            sale = order.converted_sale
            sale.notes = f"{sale.notes}\n[Payment of ₱{amount:.2f} via {payment_method} recorded on {payment_date}]".strip()
            sale.save()

        serializer = self.get_serializer(payment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        payment = self.get_object()
        order = payment.order
        order.amount_paid = max(Decimal('0.00'), (order.amount_paid or Decimal('0.00')) - payment.amount)
        order.save()
        return super().destroy(request, *args, **kwargs)


class FeaturedOrderViewSet(viewsets.ModelViewSet):
    queryset = FeaturedOrder.objects.all().order_by('display_order', '-created_at')
    serializer_class = FeaturedOrderSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        return [AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        include_all = self.request.query_params.get('all') == 'true'
        category = self.request.query_params.get('category')
        if not self.request.user.is_authenticated and not include_all:
            qs = qs.filter(is_published=True)
        if category and category.lower() != 'all':
            qs = qs.filter(category__iexact=category)
        return qs

    @action(detail=True, methods=['post'], url_path='toggle-featured')
    def toggle_featured(self, request, pk=None):
        order = self.get_object()
        order.is_featured = not order.is_featured
        order.save()
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], url_path='toggle-published')
    def toggle_published(self, request, pk=None):
        order = self.get_object()
        order.is_published = not order.is_published
        order.save()
        return Response(self.get_serializer(order).data)


class SaleOrderViewSet(viewsets.ModelViewSet):
    queryset = SaleOrder.objects.all().prefetch_related(
        'items__product_variant__product'
    ).order_by('-sale_date', '-id')
    serializer_class = SaleOrderSerializer

    def get_queryset(self):
        # Auto-backfill completed customer inquiries into official SaleOrders so sales register is always accurate
        completed_unconverted = CustomerInquiry.objects.filter(status=InquiryStatus.COMPLETED, converted_sale__isnull=True)
        for inq in completed_unconverted:
            try:
                inq.auto_create_sale_order()
            except Exception:
                pass

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
        customer_id = data.get('customer')
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
            customer_id=customer_id if customer_id else None,
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

    @action(detail=True, methods=['get'], url_path='receipt-pdf')
    def download_receipt(self, request, pk=None):
        order = self.get_object()
        return generate_receipt_pdf(order)


class CustomerInquiryViewSet(viewsets.ModelViewSet):
    queryset = CustomerInquiry.objects.all().select_related('customer', 'converted_sale').prefetch_related('payments').order_by('-created_at')
    serializer_class = CustomerInquirySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # Auto-convert any completed inquiries
        completed_unconverted = CustomerInquiry.objects.filter(status=InquiryStatus.COMPLETED, converted_sale__isnull=True)
        for inq in completed_unconverted:
            try:
                inq.auto_create_sale_order()
            except Exception:
                pass

        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        payment_status = self.request.query_params.get('payment_status')
        search = self.request.query_params.get('search')
        customer_id = self.request.query_params.get('customer')

        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)
        if payment_status and payment_status != 'ALL':
            qs = qs.filter(payment_status=payment_status)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if search:
            qs = qs.filter(
                Q(inquiry_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_phone__icontains=search) |
                Q(items_summary__icontains=search)
            )
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        order_timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        inquiry_number = f"CRV-ORD-{order_timestamp}"
        customer_name = data.get('customer_name', '').strip() or 'Customer'
        customer_phone = data.get('customer_phone', '').strip()
        customer_email = data.get('customer_email', '').strip()
        delivery_address = data.get('delivery_address', '').strip()
        delivery_method = data.get('delivery_method', 'PICKUP')
        order_type = data.get('order_type', 'REGULAR')
        special_instructions = data.get('special_instructions', '')
        target_date = data.get('target_date') or None
        items_summary = data.get('items_summary', '')
        items_json = data.get('items_json', [])
        estimated_total = Decimal(str(data.get('estimated_total', '0.00')))
        notes = data.get('notes', '')
        initial_status = data.get('status', InquiryStatus.PENDING)

        payment_type = data.get('payment_type', 'PAY_ON_PICKUP')
        initial_deposit = Decimal(str(data.get('initial_deposit', '0.00')))
        payment_due_date = data.get('payment_due_date') or None
        payment_notes = data.get('payment_notes', '')

        customer = None
        if customer_phone:
            customer = Customer.objects.filter(phone=customer_phone).first()
        if not customer and customer_name and customer_name != 'Customer':
            customer = Customer.objects.filter(name__iexact=customer_name).first()

        if not customer and customer_name:
            customer = Customer.objects.create(
                name=customer_name,
                phone=customer_phone,
                email=customer_email,
                address=delivery_address,
                notes=f"First order placed on {timezone.now().strftime('%Y-%m-%d')}"
            )
        elif customer:
            if customer_email and not customer.email:
                customer.email = customer_email
            if delivery_address and not customer.address:
                customer.address = delivery_address
            customer.save()

        inquiry = CustomerInquiry.objects.create(
            inquiry_number=inquiry_number,
            shared_order_number=inquiry_number,
            customer=customer,
            customer_name=customer.name if customer else customer_name,
            customer_phone=customer.phone if customer else customer_phone,
            order_type=order_type,
            delivery_method=delivery_method,
            delivery_address=delivery_address,
            special_instructions=special_instructions,
            target_date=target_date,
            items_summary=items_summary,
            items_json=items_json,
            estimated_total=estimated_total,
            notes=notes,
            status=initial_status,
            payment_type=payment_type,
            initial_deposit=initial_deposit,
            amount_paid=initial_deposit,
            payment_due_date=payment_due_date,
            payment_notes=payment_notes,
        )

        if initial_deposit > 0:
            payment_method = data.get('payment_method', PaymentMethod.GCASH)
            ref_num = data.get('payment_reference', '')
            CustomerPayment.objects.create(
                order=inquiry,
                customer=customer,
                payment_date=timezone.now().date(),
                amount=initial_deposit,
                payment_method=payment_method,
                reference_number=ref_num,
                notes='Initial deposit recorded with order submission',
                recorded_by=request.user if request.user.is_authenticated else None
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
            if inquiry.status == InquiryStatus.COMPLETED and not inquiry.converted_sale_id:
                inquiry.auto_create_sale_order()
            return Response(self.get_serializer(inquiry).data)
        return Response({'detail': f'Invalid status. Allowed: {list(InquiryStatus.values)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='record-payment')
    @transaction.atomic
    def record_payment(self, request, pk=None):
        inquiry = self.get_object()
        amount = Decimal(str(request.data.get('amount', '0.00')))
        if amount <= 0:
            return Response({'detail': 'Payment amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = request.data.get('payment_method', PaymentMethod.CASH)
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')
        payment_date = request.data.get('payment_date') or timezone.now().date()

        payment = CustomerPayment.objects.create(
            order=inquiry,
            customer=inquiry.customer,
            payment_date=payment_date,
            amount=amount,
            payment_method=payment_method,
            reference_number=reference_number,
            notes=notes,
            recorded_by=request.user if request.user.is_authenticated else None
        )

        inquiry.amount_paid = (inquiry.amount_paid or Decimal('0.00')) + amount
        inquiry.save()

        if inquiry.converted_sale:
            sale = inquiry.converted_sale
            sale.notes = f"{sale.notes}\n[Payment: ₱{amount:.2f} via {payment_method} on {payment_date}]".strip()
            sale.save()

        return Response({
            'order': self.get_serializer(inquiry).data,
            'payment': CustomerPaymentSerializer(payment).data,
            'remaining_balance': float(inquiry.remaining_balance)
        })

    @action(detail=True, methods=['post'], url_path='create-production')
    @transaction.atomic
    def create_production(self, request, pk=None):
        """Order-to-Production Integration (Section 3A): Automatically creates scheduled production runs from order items"""
        inquiry = self.get_object()
        items = inquiry.items_json or []
        created_runs = []

        target_date = inquiry.target_date or timezone.now().date()
        notes = f"Auto-scheduled from Customer Order {inquiry.inquiry_number} for {inquiry.customer_name}."

        for item in items:
            name = item.get('name', '')
            qty = int(item.get('qty', 1))

            variant = ProductVariant.objects.filter(name__icontains=name.split('—')[0].strip()).first()
            if not variant:
                variant = ProductVariant.objects.first()

            if not variant or not hasattr(variant, 'recipe'):
                continue

            recipe = variant.recipe
            batches = Decimal(str(math.ceil(qty / max(1, recipe.batch_yield))))
            planned_yield = int(recipe.batch_yield * batches)

            prod_run = ProductionOrder.objects.create(
                production_number=f"PRD-{inquiry.inquiry_number[-8:]}-{variant.id}",
                order_number_ref=inquiry.shared_order_number or inquiry.inquiry_number,
                customer_inquiry=inquiry,
                recipe=recipe,
                product_variant=variant,
                production_date=target_date,
                batches_count=batches,
                planned_yield=planned_yield,
                actual_yield=planned_yield,
                status=ProductionStatus.PLANNED,
                notes=notes,
                created_by=request.user if request.user.is_authenticated else None
            )

            total_ing_cost = Decimal('0.00')
            for ri in recipe.recipe_ingredients.all():
                needed = ri.quantity_used * batches
                unit_cost = ri.ingredient.cost_per_unit
                usage_cost = needed * unit_cost
                total_ing_cost += usage_cost

                prod_run.ingredient_usages.create(
                    ingredient=ri.ingredient,
                    required_quantity=needed,
                    actual_quantity_used=needed,
                    original_recipe_quantity=needed,
                    is_additional=False,
                    unit=ri.unit,
                    unit_cost_snapshot=unit_cost,
                    total_cost=usage_cost
                )

            total_cost = total_ing_cost + (recipe.total_overhead_cost * batches)
            prod_run.total_production_cost = total_cost
            prod_run.cost_per_unit = total_cost / max(1, Decimal(str(planned_yield)))
            prod_run.save()
            created_runs.append(prod_run.production_number)

        inquiry.status = InquiryStatus.SCHEDULED_PRODUCTION
        inquiry.save()

        return Response({
            'detail': f"Successfully created {len(created_runs)} production run(s): {', '.join(created_runs)}",
            'production_numbers': created_runs,
            'order': self.get_serializer(inquiry).data
        })

    @action(detail=True, methods=['post'], url_path='convert-to-sale')
    @transaction.atomic
    def convert_to_sale(self, request, pk=None):
        """Order-to-Sales Integration: converts inquiry to official SaleOrder"""
        inquiry = self.get_object()
        if inquiry.converted_sale:
            return Response({
                'detail': f'This order is already linked to Sale Order {inquiry.converted_sale.receipt_number}.',
                'sale_order_id': inquiry.converted_sale.id,
                'receipt_number': inquiry.converted_sale.receipt_number,
                'inquiry': self.get_serializer(inquiry).data
            })

        sale_order = inquiry.auto_create_sale_order()
        inquiry.status = InquiryStatus.COMPLETED
        inquiry.save()

        return Response({
            'inquiry': self.get_serializer(inquiry).data,
            'sale_order_id': sale_order.id,
            'receipt_number': sale_order.receipt_number
        })

    @action(detail=False, methods=['get'], url_path='receivables-summary')
    def receivables_summary(self, request):
        today = timezone.now().date()
        week_ahead = today + timezone.timedelta(days=7)

        active_orders = CustomerInquiry.objects.exclude(status=InquiryStatus.CANCELLED)
        unpaid_orders = active_orders.filter(remaining_balance__gt=0)

        total_receivables = unpaid_orders.aggregate(total=Sum('remaining_balance'))['total'] or Decimal('0.00')
        unpaid_count = unpaid_orders.filter(amount_paid=0).count()
        partial_count = unpaid_orders.filter(amount_paid__gt=0).count()

        due_today_orders = unpaid_orders.filter(payment_due_date=today)
        due_this_week_orders = unpaid_orders.filter(payment_due_date__gt=today, payment_due_date__lte=week_ahead)
        overdue_orders = unpaid_orders.filter(payment_due_date__lt=today)

        upcoming_payments_list = []
        for ord in unpaid_orders.filter(payment_due_date__isnull=False).order_by('payment_due_date')[:10]:
            days_diff = (ord.payment_due_date - today).days if ord.payment_due_date else None
            upcoming_payments_list.append({
                'id': ord.id,
                'order_number': ord.inquiry_number,
                'customer_name': ord.customer_name,
                'customer_phone': ord.customer_phone,
                'remaining_balance': float(ord.remaining_balance),
                'amount_paid': float(ord.amount_paid),
                'estimated_total': float(ord.estimated_total),
                'payment_due_date': ord.payment_due_date,
                'days_remaining': days_diff,
                'payment_status': ord.payment_status,
            })

        return Response({
            'total_receivables': float(total_receivables),
            'unpaid_count': unpaid_count,
            'partial_count': partial_count,
            'due_today_count': due_today_orders.count(),
            'due_today_amount': float(due_today_orders.aggregate(s=Sum('remaining_balance'))['s'] or 0),
            'due_this_week_count': due_this_week_orders.count(),
            'due_this_week_amount': float(due_this_week_orders.aggregate(s=Sum('remaining_balance'))['s'] or 0),
            'overdue_count': overdue_orders.count(),
            'overdue_amount': float(overdue_orders.aggregate(s=Sum('remaining_balance'))['s'] or 0),
            'upcoming_payments': upcoming_payments_list
        })

    @action(detail=True, methods=['get'], url_path='receipt-pdf')
    def download_receipt(self, request, pk=None):
        inquiry = self.get_object()
        return generate_inquiry_receipt_pdf(inquiry)


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
