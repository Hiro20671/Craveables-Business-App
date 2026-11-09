import io
import os
import math
import textwrap
from decimal import Decimal
from PIL import Image, ImageDraw, ImageFont

from django.db import transaction
from django.db.models import Sum, Count, Avg, Q
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import (
    SaleOrder, SaleItem, PaymentMethod, CustomerInquiry, InquiryStatus,
    CustomerReview, Customer, CustomerPayment, PaymentStatus, FeaturedOrder,
    match_product_variant, sync_all_inquiries_to_sales, parse_date_safe
)
from .serializers import (
    SaleOrderSerializer, SaleItemSerializer, CustomerInquirySerializer,
    CustomerReviewSerializer, CustomerSerializer, CustomerPaymentSerializer,
    FeaturedOrderSerializer
)
from apps.products.models import ProductVariant
from apps.costing.models import Recipe
from apps.production.models import ProductionOrder, ProductionStatus


def _load_receipt_font(size=14, bold=False):
    candidates = (
        [
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        if bold
        else [
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ]
    )
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def render_receipt_png(
    receipt_title,
    receipt_no,
    date_str,
    customer_name,
    customer_phone,
    payment_label,
    address_str,
    items_rows,
    summary_rows,
    status_badge="PAID",
    filename_prefix="CRAVEABLES-Receipt",
    inline=False,
):
    width = 780
    wrapped_items = []
    for desc, qty_str, price_str, total_str in items_rows:
        lines = textwrap.wrap(str(desc), width=36) or [str(desc)]
        wrapped_items.append((lines, str(qty_str), str(price_str), str(total_str)))

    items_height = sum(max(1, len(lines)) * 22 + 16 for lines, _, _, _ in wrapped_items)
    summary_height = len(summary_rows) * 30 + 24
    extra_meta_height = 26 if address_str else 0
    height = 350 + extra_meta_height + items_height + summary_height + 95

    img = Image.new("RGB", (width, height), "#FFF9DF")
    draw = ImageDraw.Draw(img)

    font_brand = _load_receipt_font(30, bold=True)
    font_sub = _load_receipt_font(12, bold=True)
    font_small = _load_receipt_font(12, bold=False)
    font_body = _load_receipt_font(14, bold=False)
    font_bold = _load_receipt_font(14, bold=True)
    font_total = _load_receipt_font(17, bold=True)

    # Outer receipt card
    card_margin = 24
    draw.rounded_rectangle(
        (card_margin, card_margin, width - card_margin, height - card_margin),
        radius=20,
        fill="#FFFDF5",
        outline="#E9D8B8",
        width=2,
    )

    # Header Banner
    header_bottom = card_margin + 115
    draw.rounded_rectangle(
        (card_margin, card_margin, width - card_margin, header_bottom),
        radius=20,
        fill="#3B170B",
    )
    draw.rectangle(
        (card_margin, header_bottom - 20, width - card_margin, header_bottom),
        fill="#3B170B",
    )

    draw.text((width // 2, card_margin + 28), "CRAVEABLES", fill="#FFF9DF", font=font_brand, anchor="mm")
    draw.text(
        (width // 2, card_margin + 62),
        "MADE TO CRAVE • BAKED WITH LOVE",
        fill="#E9D8B8",
        font=font_sub,
        anchor="mm",
    )
    draw.text(
        (width // 2, card_margin + 88),
        "Lucena City, Quezon • Small-Batch Artisanal Bakery",
        fill="#C8A97E",
        font=font_small,
        anchor="mm",
    )

    y = header_bottom + 22
    left_x = card_margin + 30
    right_x = width - card_margin - 30

    # Status Badge
    badge_bg = "#15803D" if "PAID" in status_badge.upper() and "UNPAID" not in status_badge.upper() else "#B45309"
    draw.rounded_rectangle((right_x - 150, y - 4, right_x, y + 26), radius=10, fill=badge_bg)
    draw.text((right_x - 75, y + 11), status_badge.upper(), fill="#FFFFFF", font=font_sub, anchor="mm")

    draw.text((left_x, y), f"{receipt_title}: {receipt_no}", fill="#3B170B", font=font_bold)
    y += 26
    draw.text((left_x, y), f"Date: {date_str}", fill="#4A3525", font=font_body)
    y += 24
    cust_line = f"Customer: {customer_name or 'Valued Customer'}"
    if customer_phone:
        cust_line += f" ({customer_phone})"
    draw.text((left_x, y), cust_line, fill="#4A3525", font=font_body)
    y += 24
    draw.text((left_x, y), f"Payment / Order Info: {payment_label}", fill="#4A3525", font=font_body)
    y += 24
    if address_str:
        draw.text((left_x, y), f"Address: {address_str[:65]}", fill="#4A3525", font=font_body)
        y += 26

    y += 8
    # Table Header
    draw.rounded_rectangle((left_x, y, right_x, y + 36), radius=8, fill="#3B170B")
    draw.text((left_x + 14, y + 18), "ITEM DESCRIPTION", fill="#FFFFFF", font=font_sub, anchor="lm")
    draw.text((right_x - 230, y + 18), "QTY", fill="#FFFFFF", font=font_sub, anchor="rm")
    draw.text((right_x - 115, y + 18), "PRICE", fill="#FFFFFF", font=font_sub, anchor="rm")
    draw.text((right_x - 14, y + 18), "TOTAL", fill="#FFFFFF", font=font_sub, anchor="rm")
    y += 40

    # Table Rows
    for idx, (lines, qty_str, price_str, total_str) in enumerate(wrapped_items):
        row_h = max(1, len(lines)) * 22 + 12
        row_bg = "#FFFFFF" if idx % 2 == 0 else "#FFF9EB"
        draw.rounded_rectangle((left_x, y, right_x, y + row_h), radius=6, fill=row_bg, outline="#EFE3C8", width=1)
        for line_i, line_text in enumerate(lines):
            draw.text((left_x + 14, y + 8 + line_i * 22), line_text, fill="#17110D", font=font_body)
        draw.text((right_x - 230, y + 8), qty_str, fill="#17110D", font=font_bold, anchor="ra")
        draw.text((right_x - 115, y + 8), price_str, fill="#4A3525", font=font_body, anchor="ra")
        draw.text((right_x - 14, y + 8), total_str, fill="#3B170B", font=font_bold, anchor="ra")
        y += row_h + 4

    y += 10
    # Summary Box
    sum_box_top = y
    sum_box_bottom = y + summary_height
    draw.rounded_rectangle(
        (left_x, sum_box_top, right_x, sum_box_bottom),
        radius=12,
        fill="#FFF9DF",
        outline="#E9D8B8",
        width=2,
    )
    sy = sum_box_top + 14
    for s_idx, (label, val_str) in enumerate(summary_rows):
        is_main = s_idx == len(summary_rows) - 1 or "TOTAL" in label.upper()
        f_use = font_total if is_main else font_bold
        color_use = "#15803D" if "DISCOUNT" in label.upper() or "SAVED" in label.upper() else "#3B170B"
        draw.text((left_x + 18, sy), label, fill=color_use, font=f_use)
        draw.text((right_x - 18, sy), val_str, fill=color_use, font=f_use, anchor="ra")
        sy += 30

    # Footer
    fy = sum_box_bottom + 28
    draw.line((left_x, fy - 12, right_x, fy - 12), fill="#E9D8B8", width=1)
    draw.text(
        (width // 2, fy + 6),
        "Thank you for choosing CRAVEABLES! Baked fresh with love by Dyna, Jeremy & Anne.",
        fill="#A97845",
        font=font_sub,
        anchor="mm",
    )

    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    response = HttpResponse(buffer.getvalue(), content_type="image/png")
    disp_type = "inline" if inline else "attachment"
    response["Content-Disposition"] = f'{disp_type}; filename="{filename_prefix}-{receipt_no}.png"'
    return response


def generate_receipt_pdf(sale_order, inline=False):
    items_rows = []
    for item in sale_order.items.all():
        items_rows.append((
            item.product_variant.display_name,
            str(item.quantity),
            f"PHP {float(item.selling_price):,.2f}",
            f"PHP {float(item.total_price):,.2f}",
        ))
    if not items_rows:
        items_rows.append(("Assorted Fresh Bakes", "1", f"PHP {float(sale_order.total_sales):,.2f}", f"PHP {float(sale_order.total_sales):,.2f}"))

    summary_rows = [
        ("Subtotal:", f"PHP {float(sale_order.subtotal):,.2f}"),
    ]
    if sale_order.discount and sale_order.discount > 0:
        summary_rows.append(("Wholesale / Promo Discount:", f"-PHP {float(sale_order.discount):,.2f}"))
    summary_rows.append(("TOTAL AMOUNT PAID:", f"PHP {float(sale_order.total_sales):,.2f}"))

    return render_receipt_png(
        receipt_title="Official Sales Receipt",
        receipt_no=sale_order.receipt_number,
        date_str=sale_order.sale_date.strftime("%B %d, %Y") if hasattr(sale_order.sale_date, "strftime") else str(sale_order.sale_date),
        customer_name=sale_order.customer_name or "Valued Customer",
        customer_phone="",
        payment_label=f"{sale_order.payment_method} (Completed Sale)",
        address_str="",
        items_rows=items_rows,
        summary_rows=summary_rows,
        status_badge="PAID",
        filename_prefix="CRAVEABLES-Receipt",
        inline=inline,
    )


def generate_inquiry_receipt_pdf(inquiry, inline=False):
    order_num = inquiry.shared_order_number or inquiry.inquiry_number
    items_rows = []
    reg_subtotal = 0.0
    total_saved = 0.0
    if inquiry.items_json:
        for itm in inquiry.items_json:
            qty = int(itm.get("qty", 1))
            prc = float(itm.get("price", 0))
            reg_p = float(itm.get("regular_price", prc))
            disc = float(itm.get("discount", 0))
            reg_subtotal += reg_p * qty
            total_saved += disc
            name_str = itm.get("name", "Bake Item")
            if itm.get("tier"):
                name_str += f" ({itm.get('tier')})"
            items_rows.append((
                name_str,
                str(qty),
                f"PHP {prc:,.2f}",
                f"PHP {(qty * prc):,.2f}",
            ))
    else:
        est = float(inquiry.estimated_total or 0)
        reg_subtotal = est
        items_rows.append((
            inquiry.items_summary or "Assorted Bakes",
            "1",
            f"PHP {est:,.2f}",
            f"PHP {est:,.2f}",
        ))

    summary_rows = []
    if total_saved > 0:
        summary_rows.append(("Regular Retail Subtotal:", f"PHP {reg_subtotal:,.2f}"))
        summary_rows.append(("Wholesale Reseller Discount:", f"-PHP {total_saved:,.2f}"))
    summary_rows.append(("Order Total:", f"PHP {float(inquiry.estimated_total or 0):,.2f}"))
    summary_rows.append(("Amount Paid / Deposit:", f"PHP {float(inquiry.amount_paid or 0):,.2f}"))
    summary_rows.append(("Remaining Balance Due:", f"PHP {float(inquiry.remaining_balance or 0):,.2f}"))

    date_str = (
        inquiry.target_date.strftime("%B %d, %Y")
        if hasattr(inquiry.target_date, "strftime") and inquiry.target_date
        else (str(inquiry.target_date) if inquiry.target_date else "Immediate")
    )

    return render_receipt_png(
        receipt_title="Whole Sales Receipt" if inquiry.order_type == "WHOLESALE" else "Customer Order Receipt",
        receipt_no=order_num,
        date_str=date_str,
        customer_name=inquiry.customer_name,
        customer_phone=inquiry.customer_phone,
        payment_label=f"{inquiry.order_type} • {inquiry.delivery_method} • {inquiry.payment_status}",
        address_str=inquiry.delivery_address or "",
        items_rows=items_rows,
        summary_rows=summary_rows,
        status_badge=str(inquiry.payment_status or "UNPAID"),
        filename_prefix="CRAVEABLES-Receipt",
        inline=inline,
    )


def render_loyalty_card_png(customer, inline=False):
    from django.conf import settings
    root_dir = settings.BASE_DIR.parent
    bg_candidates = [
        os.path.join(root_dir, 'frontend', 'public', 'loyalty-card-bg.jpg'),
        os.path.join(root_dir, 'frontend', 'dist', 'loyalty-card-bg.jpg'),
    ]
    logo_candidates = [
        os.path.join(root_dir, 'frontend', 'public', 'logo.png'),
        os.path.join(root_dir, 'frontend', 'dist', 'logo.png'),
    ]

    bg_path = next((p for p in bg_candidates if os.path.exists(p)), None)
    logo_path = next((p for p in logo_candidates if os.path.exists(p)), None)

    if bg_path:
        card_img = Image.open(bg_path).convert('RGBA').resize((1004, 591), Image.Resampling.LANCZOS)
    else:
        card_img = Image.new('RGBA', (1004, 591), (244, 234, 219, 255))

    # Stamp the circular CRAVEABLES logo inside earned stamp circles
    stamps_to_draw = min(5, max(0, int(customer.loyalty_stamps or 0)))
    x_centers = [123, 275, 426, 577, 729]
    y_center = 373
    stamp_size = 112

    if logo_path and stamps_to_draw > 0:
        logo_raw = Image.open(logo_path).convert('RGBA').resize((stamp_size, stamp_size), Image.Resampling.LANCZOS)
        # Circular alpha mask
        mask = Image.new('L', (stamp_size, stamp_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((2, 2, stamp_size - 2, stamp_size - 2), fill=255)

        for idx in range(stamps_to_draw):
            cx = x_centers[idx]
            top_left = (int(cx - stamp_size // 2), int(y_center - stamp_size // 2))
            card_img.paste(logo_raw, top_left, mask)

    # Create final canvas with personalized customer footer bar
    footer_height = 76
    canvas = Image.new('RGB', (1004, 591 + footer_height), '#3B170B')
    canvas.paste(card_img.convert('RGB'), (0, 0))

    draw = ImageDraw.Draw(canvas)
    font_name = _load_receipt_font(20, bold=True)
    font_meta = _load_receipt_font(14, bold=True)
    font_badge = _load_receipt_font(15, bold=True)

    card_no = customer.loyalty_card_number or f"CRV-LYL-{customer.id:04d}"
    holder_text = f"CARD HOLDER: {customer.name.upper()}   •   {card_no}"
    draw.text((32, 591 + 24), holder_text, fill='#FFF9DF', font=font_name)

    sub_text = f"Qualifying Orders (>= PHP 100): {customer.qualifying_orders_count}   •   Free Brownie Rewards Claimed: {customer.rewards_redeemed}"
    draw.text((32, 591 + 50), sub_text, fill='#E9D8B8', font=font_meta)

    status_pill_text = (
        f"READY FOR FREE BROWNIES! ({customer.loyalty_stamps}/5 STAMPS)"
        if customer.loyalty_stamps >= 5
        else f"ACTIVE STAMPS: {customer.loyalty_stamps} / 5"
    )
    pill_bg = '#15803D' if customer.loyalty_stamps >= 5 else '#6A2E1B'
    draw.rounded_rectangle((650, 591 + 18, 976, 591 + 58), radius=14, fill=pill_bg, outline='#E9D8B8', width=1)
    draw.text((813, 591 + 38), status_pill_text, fill='#FFF9DF', font=font_badge, anchor='mm')

    buffer = io.BytesIO()
    canvas.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)

    safe_name = "".join(c if c.isalnum() or c in ('-', '_') else '-' for c in (customer.name or 'Customer'))
    disposition = 'inline' if inline else 'attachment'
    response = HttpResponse(buffer.getvalue(), content_type='image/png')
    response['Content-Disposition'] = f'{disposition}; filename="CRAVEABLES-Loyalty-Card-{safe_name}.png"'
    return response

class SaleOrderViewSet(viewsets.ModelViewSet):
    queryset = SaleOrder.objects.all().prefetch_related(
        'items__product_variant__product'
    ).order_by('-sale_date', '-id')
    serializer_class = SaleOrderSerializer

    def get_queryset(self):
        sync_all_inquiries_to_sales()

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
        # Delete or zero out
        order_num = order.receipt_number
        order.delete()
        return Response({'detail': f'Sale order {order_num} has been undone and stock restored.'})

    @action(detail=False, methods=['get'], url_path='summary')
    def summary_metrics(self, request):
        sync_all_inquiries_to_sales()

        qs = self.get_queryset()
        totals = qs.aggregate(
            sum_total_sales=Sum('total_sales'),
            sum_gross_profit=Sum('gross_profit'),
            sum_total_cogs=Sum('total_cogs'),
            orders_count=Count('id'),
            avg_sale=Avg('total_sales')
        )
        total_units = SaleItem.objects.filter(sale_order__in=qs).aggregate(units=Sum('quantity'))['units'] or 0

        return Response({
            'total_sales': totals['sum_total_sales'] or 0.00,
            'total_gross_profit': totals['sum_gross_profit'] or 0.00,
            'total_cogs': totals['sum_total_cogs'] or 0.00,
            'orders_count': totals['orders_count'] or 0,
            'average_sale': round(totals['avg_sale'] or 0.00, 2),
            'total_units_sold': total_units,
        })


    @action(detail=True, methods=['get'], url_path='receipt-pdf')
    def download_receipt(self, request, pk=None):
        order = self.get_object()
        inline = request.query_params.get('inline') == '1'
        return generate_receipt_pdf(order, inline=inline)

    @action(detail=True, methods=['get'], url_path='receipt-image')
    def download_receipt_image(self, request, pk=None):
        order = self.get_object()
        inline = request.query_params.get('inline') == '1'
        return generate_receipt_pdf(order, inline=inline)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        sync_all_inquiries_to_sales()
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search) |
                Q(loyalty_card_number__icontains=search)
            )
        return qs

    @action(detail=True, methods=['get'], url_path='history')
    def customer_history(self, request, pk=None):
        customer = self.get_object()
        customer.recalculate_loyalty_stamps()
        orders = customer.orders.all().order_by('-created_at')
        payments = customer.payments.all().order_by('-payment_date', '-id')
        return Response({
            'customer': CustomerSerializer(customer).data,
            'orders': CustomerInquirySerializer(orders, many=True).data,
            'payments': CustomerPaymentSerializer(payments, many=True).data,
        })

    @action(detail=True, methods=['post'], url_path='update-loyalty')
    @transaction.atomic
    def update_loyalty(self, request, pk=None):
        customer = self.get_object()
        action_type = request.data.get('action_type', 'set_stamps')
        auto_stamps = customer.qualifying_orders_count - (customer.rewards_redeemed * 5)

        if action_type in ('remove_card', 'restore_card'):
            customer.loyalty_card_removed = (action_type == 'remove_card')
            customer.save(update_fields=['loyalty_card_removed'])
            return Response(CustomerSerializer(customer).data)

        if action_type == 'add_stamp':
            customer.manual_stamp_adjustment = (customer.manual_stamp_adjustment or 0) + 1
        elif action_type == 'remove_stamp':
            current_total = max(0, auto_stamps + (customer.manual_stamp_adjustment or 0))
            if current_total > 0:
                customer.manual_stamp_adjustment = (customer.manual_stamp_adjustment or 0) - 1
        elif action_type == 'set_stamps':
            target_stamps = max(0, int(request.data.get('stamps', customer.loyalty_stamps)))
            customer.manual_stamp_adjustment = target_stamps - auto_stamps
        elif action_type == 'redeem_reward':
            current_total = max(0, auto_stamps + (customer.manual_stamp_adjustment or 0))
            if current_total < 5:
                return Response({'detail': 'Customer needs at least 5 stamps to redeem a free small box of brownies.'}, status=status.HTTP_400_BAD_REQUEST)
            customer.rewards_redeemed = (customer.rewards_redeemed or 0) + 1
            stamp_note = f"Redeemed 1 FREE Small Box of Brownies (3 pcs) on {timezone.now().strftime('%Y-%m-%d')}"
            customer.reward_notes = f"{customer.reward_notes}\n{stamp_note}".strip() if customer.reward_notes else stamp_note

        if 'rewards_redeemed' in request.data and action_type != 'redeem_reward':
            customer.rewards_redeemed = max(0, int(request.data.get('rewards_redeemed', customer.rewards_redeemed)))
            if action_type == 'set_stamps':
                auto_stamps = customer.qualifying_orders_count - (customer.rewards_redeemed * 5)
                target_stamps = max(0, int(request.data.get('stamps', customer.loyalty_stamps)))
                customer.manual_stamp_adjustment = target_stamps - auto_stamps

        if 'reward_notes' in request.data:
            customer.reward_notes = request.data.get('reward_notes', '')

        customer.save()
        customer.recalculate_loyalty_stamps()
        return Response(CustomerSerializer(customer).data)

    @action(detail=True, methods=['get'], url_path='loyalty-card-image')
    def loyalty_card_image(self, request, pk=None):
        customer = self.get_object()
        customer.recalculate_loyalty_stamps()
        inline = request.query_params.get('inline') == '1'
        return render_loyalty_card_png(customer, inline=inline)

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
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        amount = Decimal(str(data.get('amount', '0.00')))
        if amount <= 0:
            return Response({'detail': 'Payment amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = data.get('payment_method', PaymentMethod.CASH)
        reference_number = data.get('reference_number', '')
        notes = data.get('notes', '')
        payment_date = data.get('payment_date') or timezone.now().date()

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

        # Update order's amount_paid and recalculate balance/status
        order.amount_paid = (order.amount_paid or Decimal('0.00')) + amount
        order.save()

        # If order has a linked sale order, update its notes
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
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [AllowAny()]  # Admin actions can be executed

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



class CustomerInquiryViewSet(viewsets.ModelViewSet):
    queryset = CustomerInquiry.objects.all().select_related('customer', 'converted_sale').prefetch_related('payments').order_by('-created_at')
    serializer_class = CustomerInquirySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        sync_all_inquiries_to_sales()

        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        payment_status = self.request.query_params.get('payment_status')
        order_type = self.request.query_params.get('order_type')
        search = self.request.query_params.get('search')
        customer_id = self.request.query_params.get('customer')

        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)
        if payment_status and payment_status != 'ALL':
            qs = qs.filter(payment_status=payment_status)
        if order_type and order_type != 'ALL':
            qs = qs.filter(order_type=order_type)
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
        order_type = data.get('order_type', 'REGULAR')
        order_timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        prefix = "CRV-WSL" if order_type == 'WHOLESALE' else "CRV-ORD"
        inquiry_number = f"{prefix}-{order_timestamp}"
        customer_name = data.get('customer_name', '').strip() or 'Customer'
        customer_phone = data.get('customer_phone', '').strip()
        customer_email = data.get('customer_email', '').strip()
        delivery_address = data.get('delivery_address', '').strip()
        delivery_method = data.get('delivery_method', 'PICKUP')
        special_instructions = data.get('special_instructions', '')
        target_date = parse_date_safe(data.get('target_date'))
        items_summary = data.get('items_summary', '')
        items_json = data.get('items_json', [])
        estimated_total = Decimal(str(data.get('estimated_total') or '0.00'))
        notes = data.get('notes', '')
        initial_status = data.get('status', InquiryStatus.PENDING)

        # Payment options
        payment_type = data.get('payment_type', 'PAY_ON_PICKUP')
        initial_deposit = Decimal(str(data.get('initial_deposit') or '0.00'))
        payment_due_date = parse_date_safe(data.get('payment_due_date'))
        payment_notes = data.get('payment_notes', '')

        # Customer Profile Linking / Creation (auto-enrolls customer in Loyalty Card by name)
        customer = None
        if customer_name and customer_name != 'Customer':
            customer = Customer.objects.filter(name__iexact=customer_name).first()
        if not customer and customer_phone:
            customer = Customer.objects.filter(phone=customer_phone, name__iexact=customer_name).first()

        if not customer and customer_name:
            customer = Customer.objects.create(
                name=customer_name,
                phone=customer_phone,
                email=customer_email,
                address=delivery_address,
                notes=f"Auto-enrolled in CRAVEABLES Loyalty Card on {timezone.now().strftime('%Y-%m-%d')}"
            )
        elif customer:
            if customer_phone and not customer.phone:
                customer.phone = customer_phone
            if customer_email and not customer.email:
                customer.email = customer_email
            if delivery_address and not customer.address:
                customer.address = delivery_address
            customer.save()

        inquiry = CustomerInquiry.objects.create(
            inquiry_number=inquiry_number,
            shared_order_number=inquiry_number,
            customer=customer,
            customer_name=customer_name,
            customer_phone=customer_phone or (customer.phone if customer else ''),
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

        # If an initial deposit was made, record a CustomerPayment transaction
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
            if inquiry.status == InquiryStatus.COMPLETED and not inquiry.converted_sale_id and inquiry.payment_status == PaymentStatus.PAID:
                inquiry.auto_create_sale_order()
            return Response(self.get_serializer(inquiry).data)
        return Response({'detail': f'Invalid status. Allowed: {list(InquiryStatus.values)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='mark-given-due')
    @transaction.atomic
    def mark_given_due(self, request, pk=None):
        """Marks an order as handed over / given to customer with a 1-week (or custom) payment due date while keeping it unpaid."""
        inquiry = self.get_object()
        days = int(request.data.get('days', 7))
        custom_due = parse_date_safe(request.data.get('payment_due_date'))
        due_date = custom_due or (timezone.now().date() + timezone.timedelta(days=days))

        if request.data.get('reset_unpaid'):
            inquiry.amount_paid = Decimal('0.00')
            inquiry.initial_deposit = Decimal('0.00')
            inquiry.payments.all().delete()

        inquiry.status = InquiryStatus.COMPLETED
        inquiry.payment_due_date = due_date
        inquiry.payment_type = 'PAY_LATER_1_WEEK'
        due_note = f"Order given to customer on {timezone.now().strftime('%Y-%m-%d')} • Payment due on {due_date.strftime('%Y-%m-%d')} ({days} days)"
        inquiry.payment_notes = due_note
        inquiry.save()
        return Response(self.get_serializer(inquiry).data)

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
        inquiry.payment_type = payment_method
        inquiry.save()

        # If order is completed or fully paid, automatically create/link official SaleOrder!
        if inquiry.status == InquiryStatus.COMPLETED or inquiry.remaining_balance <= 0:
            sale = inquiry.auto_create_sale_order()
            if sale:
                sale.payment_method = payment_method
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
        notes = f"Auto-scheduled from Order {inquiry.inquiry_number} for {inquiry.customer_name}."

        for item in items:
            name = item.get('name', '')
            qty = int(item.get('qty', 1))

            variant = match_product_variant(name, item.get('price'))

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

            # Record initial ingredient usages snapshot from recipe without deducting inventory yet!
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
        """Order-to-Sales Integration (Section 3B): Prevents duplicate sales and links customer"""
        inquiry = self.get_object()
        payment_method = request.data.get('payment_method', PaymentMethod.GCASH)
        inquiry.payment_type = payment_method
        inquiry.status = InquiryStatus.COMPLETED
        if (inquiry.amount_paid or Decimal('0.00')) < (inquiry.estimated_total or Decimal('0.00')):
            inquiry.amount_paid = inquiry.estimated_total
        inquiry.save()
        sale_order = inquiry.auto_create_sale_order()

        return Response({
            'inquiry': self.get_serializer(inquiry).data,
            'sale_order_id': sale_order.id,
            'receipt_number': sale_order.receipt_number
        })

    @action(detail=False, methods=['get'], url_path='receivables-summary')
    def receivables_summary(self, request):
        """Receivables and Payment Monitoring (Section 6C & Section 8)"""
        sync_all_inquiries_to_sales()
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
        inline = request.query_params.get('inline') == '1'
        return generate_inquiry_receipt_pdf(inquiry, inline=inline)

    @action(detail=True, methods=['get'], url_path='receipt-image')
    def download_receipt_image(self, request, pk=None):
        inquiry = self.get_object()
        inline = request.query_params.get('inline') == '1'
        return generate_inquiry_receipt_pdf(inquiry, inline=inline)


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


