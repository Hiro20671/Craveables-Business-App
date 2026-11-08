from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum, Count, F
from django.utils import timezone
from decimal import Decimal
import io
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from apps.sales.models import SaleOrder, SaleItem, CustomerInquiry, Customer, CustomerPayment
from apps.expenses.models import Expense
from apps.inventory.models import Ingredient, StockTransaction
from apps.production.models import ProductionOrder, ProductionIngredientUsage
from apps.costing.models import Recipe
from apps.products.models import ProductVariant

@api_view(['GET'])
def dashboard_stats(request):
    today = timezone.now().date()
    # Overall figures
    sales_agg = SaleOrder.objects.aggregate(
        total_sales=Sum('total_sales'),
        gross_profit=Sum('gross_profit'),
        total_cogs=Sum('total_cogs')
    )
    total_sales = sales_agg['total_sales'] or Decimal('0.00')
    gross_profit = sales_agg['gross_profit'] or Decimal('0.00')

    exp_agg = Expense.objects.aggregate(total_expenses=Sum('amount'))
    operating_expenses = exp_agg['total_expenses'] or Decimal('0.00')

    net_profit = gross_profit - operating_expenses

    units_sold = SaleItem.objects.aggregate(total_units=Sum('quantity'))['total_units'] or 0

    # Inventory metrics
    all_ingredients = Ingredient.objects.all()
    inventory_value = sum(ing.stock_value for ing in all_ingredients)
    low_stock_count = sum(1 for ing in all_ingredients if ing.stock_status == 'LOW')
    out_of_stock_count = sum(1 for ing in all_ingredients if ing.stock_status == 'OUT_OF_STOCK')
    normal_stock_count = sum(1 for ing in all_ingredients if ing.stock_status == 'NORMAL')

    # Monthly performance (Last 6 months)
    monthly_data = []
    current_year = today.year
    for m in range(1, 13):
        m_sales = SaleOrder.objects.filter(sale_date__year=current_year, sale_date__month=m).aggregate(
            s=Sum('total_sales'), gp=Sum('gross_profit')
        )
        m_exp = Expense.objects.filter(date__year=current_year, date__month=m).aggregate(e=Sum('amount'))

        sales_val = float(m_sales['s'] or 0)
        gp_val = float(m_sales['gp'] or 0)
        exp_val = float(m_exp['e'] or 0)
        np_val = gp_val - exp_val

        month_name = datetime.date(current_year, m, 1).strftime('%b')
        monthly_data.append({
            'month': month_name,
            'month_num': m,
            'sales': sales_val,
            'gross_profit': gp_val,
            'expenses': exp_val,
            'net_profit': np_val
        })

    # Best selling products
    best_sellers = SaleItem.objects.values(
        'product_variant__product__name', 'product_variant__name'
    ).annotate(
        total_units=Sum('quantity'),
        total_revenue=Sum('total_price')
    ).order_by('-total_units')[:5]

    formatted_best_sellers = [
        {
            'product_name': f"{bs['product_variant__product__name']} — {bs['product_variant__name']}",
            'total_units': bs['total_units'],
            'total_revenue': float(bs['total_revenue'] or 0)
        } for bs in best_sellers
    ]

    # Recent transactions
    recent_sales = list(SaleOrder.objects.all().order_by('-sale_date', '-id')[:5].values(
        'id', 'receipt_number', 'sale_date', 'total_sales', 'payment_method'
    ))
    recent_expenses = list(Expense.objects.all().order_by('-date', '-id')[:5].values(
        'id', 'category', 'description', 'amount', 'date', 'payment_method'
    ))
    recent_transactions = list(StockTransaction.objects.select_related('ingredient').order_by('-created_at')[:6].values(
        'id', 'ingredient__name', 'transaction_type', 'quantity_change', 'ingredient__unit', 'created_at', 'reason'
    ))

    # Customer Inquiries & Pre-Orders
    recent_inquiries = list(CustomerInquiry.objects.all().order_by('-created_at')[:6].values(
        'id', 'inquiry_number', 'customer_name', 'customer_phone', 'target_date', 'items_summary', 'estimated_total', 'status', 'created_at'
    ))
    pending_inquiries_count = CustomerInquiry.objects.filter(status='PENDING').count()

    return Response({
        'total_sales': float(total_sales),
        'gross_profit': float(gross_profit),
        'operating_expenses': float(operating_expenses),
        'net_profit': float(net_profit),
        'profit_margin': round(float((net_profit / total_sales) * 100), 2) if total_sales > 0 else 0.0,
        'units_sold': units_sold,
        'inventory_value': float(inventory_value),
        'inventory_summary': {
            'total_ingredients': all_ingredients.count(),
            'normal': normal_stock_count,
            'low_stock': low_stock_count,
            'out_of_stock': out_of_stock_count
        },
        'monthly_performance': monthly_data,
        'best_sellers': formatted_best_sellers,
        'recent_sales': recent_sales,
        'recent_expenses': recent_expenses,
        'recent_transactions': recent_transactions,
        'recent_inquiries': recent_inquiries,
        'pending_inquiries_count': pending_inquiries_count
    })

@api_view(['GET'])
def profit_loss_report(request):
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    sales_qs = SaleOrder.objects.all()
    exp_qs = Expense.objects.all()

    if start_date:
        sales_qs = sales_qs.filter(sale_date__gte=start_date)
        exp_qs = exp_qs.filter(date__gte=start_date)
    if end_date:
        sales_qs = sales_qs.filter(sale_date__lte=end_date)
        exp_qs = exp_qs.filter(date__lte=end_date)

    sales_agg = sales_qs.aggregate(
        subtotal=Sum('subtotal'),
        discount=Sum('discount'),
        total_sales=Sum('total_sales'),
        cogs=Sum('total_cogs'),
        gross_profit=Sum('gross_profit')
    )

    gross_sales = sales_agg['subtotal'] or Decimal('0.00')
    discounts = sales_agg['discount'] or Decimal('0.00')
    net_sales = sales_agg['total_sales'] or Decimal('0.00')
    cogs = sales_agg['cogs'] or Decimal('0.00')
    gross_profit = sales_agg['gross_profit'] or Decimal('0.00')

    exp_by_category = exp_qs.values('category').annotate(total=Sum('amount')).order_by('-total')
    total_operating_expenses = sum(item['total'] for item in exp_by_category) or Decimal('0.00')
    net_income = gross_profit - total_operating_expenses

    return Response({
        'gross_sales': float(gross_sales),
        'discounts': float(discounts),
        'net_sales': float(net_sales),
        'cost_of_goods_sold': float(cogs),
        'gross_profit': float(gross_profit),
        'gross_margin_percentage': round(float((gross_profit / net_sales) * 100), 2) if net_sales > 0 else 0.0,
        'operating_expenses': [
            {'category': item['category'], 'amount': float(item['total'])} for item in exp_by_category
        ],
        'total_operating_expenses': float(total_operating_expenses),
        'net_income': float(net_income),
        'net_margin_percentage': round(float((net_income / net_sales) * 100), 2) if net_sales > 0 else 0.0,
    })

@api_view(['GET'])
def export_excel_report(request):
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # Styles
    header_fill = PatternFill(start_color="3B170B", end_color="3B170B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=16, bold=True, color="3B170B")
    bold_font = Font(name="Calibri", size=11, bold=True)
    border_thin = Border(
        left=Side(style='thin', color='E9D8B8'),
        right=Side(style='thin', color='E9D8B8'),
        top=Side(style='thin', color='E9D8B8'),
        bottom=Side(style='thin', color='E9D8B8')
    )

    # Sheet 1: Dashboard & P&L Summary
    ws_dash = wb.create_sheet('Dashboard & P&L')
    ws_dash['A1'] = "CRAVEABLES | BUSINESS SUMMARY & FINANCIAL REPORT"
    ws_dash['A1'].font = title_font
    ws_dash['A2'] = f"Generated on {timezone.now().strftime('%Y-%m-%d %H:%M')}"

    sales_agg = SaleOrder.objects.aggregate(s=Sum('total_sales'), gp=Sum('gross_profit'), cogs=Sum('total_cogs'))
    exp_agg = Expense.objects.aggregate(e=Sum('amount'))
    total_sales = sales_agg['s'] or Decimal('0.00')
    gross_profit = sales_agg['gp'] or Decimal('0.00')
    total_cogs = sales_agg['cogs'] or Decimal('0.00')
    total_exp = exp_agg['e'] or Decimal('0.00')
    net_profit = gross_profit - total_exp

    headers_kpi = ["Metric", "Amount (₱)"]
    ws_dash.append([])
    ws_dash.append(headers_kpi)
    ws_dash.append(["Total Gross Sales", float(total_sales)])
    ws_dash.append(["Cost of Goods Sold (COGS)", float(total_cogs)])
    ws_dash.append(["Gross Profit", float(gross_profit)])
    ws_dash.append(["Total Operating Expenses", float(total_exp)])
    ws_dash.append(["Net Profit", float(net_profit)])

    # Sheet 2: Ingredients
    ws_ing = wb.create_sheet('Ingredients Master')
    ws_ing['A1'] = "CRAVEABLES | INGREDIENTS MASTER & INVENTORY"
    ws_ing['A1'].font = title_font
    ws_ing.append([])
    headers_ing = ["Ingredient", "Supplier", "Purchase Cost (₱)", "Pack Size", "Unit", "Cost/Unit (₱)", "Current Stock", "Stock Value (₱)", "Reorder Level", "Status"]
    ws_ing.append(headers_ing)
    for col in range(1, len(headers_ing) + 1):
        cell = ws_ing.cell(3, col)
        cell.fill = header_fill
        cell.font = header_font

    for ing in Ingredient.objects.all().order_by('name'):
        ws_ing.append([
            ing.name,
            ing.supplier.name if ing.supplier else (ing.supplier_name_raw or 'Unassigned'),
            float(ing.purchase_cost),
            float(ing.package_size),
            ing.unit,
            float(ing.cost_per_unit),
            float(ing.current_stock),
            float(ing.stock_value),
            float(ing.reorder_level),
            ing.stock_status
        ])

    # Sheet 3: Product Costing
    ws_cost = wb.create_sheet('Product Costing')
    ws_cost['A1'] = "CRAVEABLES | PRODUCT RECIPES & COSTING"
    ws_cost['A1'].font = title_font
    ws_cost.append([])
    headers_cost = ["Product", "Variant", "Batch Yield", "Total Ing Cost (₱)", "Packaging Cost (₱)", "Kuryente (₱)", "Labor (₱)", "Total Batch Cost (₱)", "Cost/Unit (₱)", "Selling Price (₱)", "Profit/Unit (₱)", "Margin %"]
    ws_cost.append(headers_cost)
    for col in range(1, len(headers_cost) + 1):
        cell = ws_cost.cell(3, col)
        cell.fill = header_fill
        cell.font = header_font

    for r in Recipe.objects.all().select_related('product_variant', 'product_variant__product'):
        ws_cost.append([
            r.product_variant.product.name,
            r.product_variant.name,
            r.batch_yield,
            float(r.total_ingredient_cost),
            float(r.calculated_packaging_cost),
            float(r.electricity_cost),
            float(r.labor_cost),
            float(r.total_batch_cost),
            float(r.calculated_cost_per_unit),
            float(r.selling_price),
            float(r.profit_per_unit),
            float(r.profit_margin_percentage)
        ])

    # Sheet 4: Sales Log
    ws_sales = wb.create_sheet('Sales Log')
    ws_sales['A1'] = "CRAVEABLES | SALES LOG"
    ws_sales['A1'].font = title_font
    ws_sales.append([])
    headers_sales = ["Receipt No.", "Date", "Customer", "Payment Method", "Subtotal (₱)", "Discount (₱)", "Total Sales (₱)", "Gross Profit (₱)"]
    ws_sales.append(headers_sales)
    for col in range(1, len(headers_sales) + 1):
        cell = ws_sales.cell(3, col)
        cell.fill = header_fill
        cell.font = header_font

    for s in SaleOrder.objects.all().order_by('-sale_date', '-id'):
        ws_sales.append([
            s.receipt_number,
            s.sale_date.strftime('%Y-%m-%d'),
            s.customer_name or 'Walk-in',
            s.payment_method,
            float(s.subtotal),
            float(s.discount),
            float(s.total_sales),
            float(s.gross_profit)
        ])

    # Sheet 5: Expenses
    ws_exp = wb.create_sheet('Expenses')
    ws_exp['A1'] = "CRAVEABLES | EXPENSE LOG"
    ws_exp['A1'].font = title_font
    ws_exp.append([])
    headers_exp = ["Date", "Category", "Description", "Amount (₱)", "Payment Method", "Reference"]
    ws_exp.append(headers_exp)
    for col in range(1, len(headers_exp) + 1):
        cell = ws_exp.cell(3, col)
        cell.fill = header_fill
        cell.font = header_font

    for e in Expense.objects.all().order_by('-date', '-id'):
        ws_exp.append([
            e.date.strftime('%Y-%m-%d'),
            e.category,
            e.description,
            float(e.amount),
            e.payment_method,
            e.receipt_reference
        ])

    # Sheet 6: Customer Orders & Receivables
    ws_orders = wb.create_sheet('Customer Orders & Receivables')
    ws_orders['A1'] = "CRAVEABLES | CUSTOMER ORDERS & ACCOUNTS RECEIVABLE"
    ws_orders['A1'].font = title_font
    ws_orders.append([])
    headers_ord = [
        "Order Ref", "Customer Name", "Phone", "Target Date", "Order Type",
        "Delivery Method", "Total (₱)", "Paid (₱)", "Balance (₱)", "Due Date",
        "Payment Status", "Order Status", "Items Summary"
    ]
    ws_orders.append(headers_ord)
    for col in range(1, len(headers_ord) + 1):
        cell = ws_orders.cell(3, col)
        cell.fill = header_fill
        cell.font = header_font

    for inq in CustomerInquiry.objects.all().order_by('-created_at'):
        ws_orders.append([
            inq.shared_order_number or inq.inquiry_number,
            inq.customer_name,
            inq.customer_phone,
            inq.target_date.strftime('%Y-%m-%d') if inq.target_date else 'Immediate',
            inq.order_type,
            inq.delivery_method,
            float(inq.estimated_total or 0),
            float(inq.amount_paid or 0),
            float(inq.remaining_balance or 0),
            inq.payment_due_date.strftime('%Y-%m-%d') if inq.payment_due_date else 'N/A',
            inq.payment_status,
            inq.status,
            inq.items_summary
        ])

    # Sheet 7: Production Batches & Yield Analysis
    ws_prod = wb.create_sheet('Production Batches')
    ws_prod['A1'] = "CRAVEABLES | PRODUCTION RUNS & INVENTORY DEDUCTIONS"
    ws_prod['A1'].font = title_font
    ws_prod.append([])
    headers_prod = [
        "Production #", "Date", "Order Ref", "Recipe / Product", "Variant",
        "Batches", "Planned Yield", "Actual Yield", "Total Cost (₱)", "Cost/Unit (₱)",
        "Status", "Customized", "Adjustment Reason"
    ]
    ws_prod.append(headers_prod)
    for col in range(1, len(headers_prod) + 1):
        cell = ws_prod.cell(3, col)
        cell.fill = header_fill
        cell.font = header_font

    for po in ProductionOrder.objects.all().order_by('-production_date', '-id'):
        ws_prod.append([
            po.production_number,
            po.production_date.strftime('%Y-%m-%d') if po.production_date else '',
            po.order_number_ref or 'Internal Batch',
            po.recipe.product_variant.product.name if po.recipe else 'N/A',
            po.recipe.product_variant.name if po.recipe else 'N/A',
            float(po.batches_count),
            po.planned_yield,
            po.actual_yield or po.planned_yield,
            float(po.total_production_cost or 0),
            float(po.cost_per_unit or 0),
            po.status,
            "Yes" if po.is_customized else "No",
            po.adjustment_reason or ""
        ])

    # Sheet 8: Customer Payments History
    ws_pay = wb.create_sheet('Payment Transactions')
    ws_pay['A1'] = "CRAVEABLES | CUSTOMER PAYMENT TRANSACTIONS"
    ws_pay['A1'].font = title_font
    ws_pay.append([])
    headers_pay = ["Payment Date", "Order Ref", "Customer", "Amount (₱)", "Method", "Reference #", "Notes"]
    ws_pay.append(headers_pay)
    for col in range(1, len(headers_pay) + 1):
        cell = ws_pay.cell(3, col)
        cell.fill = header_fill
        cell.font = header_font

    for cp in CustomerPayment.objects.all().order_by('-payment_date', '-id'):
        ws_pay.append([
            cp.payment_date.strftime('%Y-%m-%d') if cp.payment_date else '',
            cp.order.shared_order_number or cp.order.inquiry_number,
            cp.customer.name if cp.customer else cp.order.customer_name,
            float(cp.amount),
            cp.payment_method,
            cp.reference_number,
            cp.notes
        ])

    # Save to buffer
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"CRAVEABLES-Report-{timezone.now().strftime('%Y%m%d')}.xlsx"
    response = HttpResponse(
        output.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

@api_view(['GET'])
def export_pdf_report(request):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#3B170B'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#A97845'),
        spaceAfter=14
    )
    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=colors.HexColor('#3B170B'),
        spaceBefore=10,
        spaceAfter=6
    )

    logo_file = 'C:\\Craveables Business App\\CRAVEABLES_OFFICIAL_LOGO.jpg'
    import os
    if os.path.exists(logo_file):
        try:
            elements.append(RLImage(logo_file, width=80, height=60))
            elements.append(Spacer(1, 6))
        except Exception:
            pass

    elements.append(Paragraph("CRAVEABLES", title_style))
    elements.append(Paragraph("MADE TO CRAVE • BAKED WITH LOVE", subtitle_style))
    elements.append(Paragraph(f"Executive Financial & Operational Report — {timezone.now().strftime('%B %d, %Y')}", styles['Normal']))
    elements.append(Spacer(1, 10))

    # P&L Summary Table
    sales_agg = SaleOrder.objects.aggregate(s=Sum('total_sales'), gp=Sum('gross_profit'), cogs=Sum('total_cogs'))
    exp_agg = Expense.objects.aggregate(e=Sum('amount'))
    total_sales = sales_agg['s'] or Decimal('0.00')
    gross_profit = sales_agg['gp'] or Decimal('0.00')
    total_cogs = sales_agg['cogs'] or Decimal('0.00')
    total_exp = exp_agg['e'] or Decimal('0.00')
    net_profit = gross_profit - total_exp

    summary_data = [
        ['Financial Metric', 'Value (PHP)'],
        ['Total Sales Revenue', f"PHP {total_sales:,.2f}"],
        ['Cost of Goods Sold (COGS)', f"PHP {total_cogs:,.2f}"],
        ['Gross Profit', f"PHP {gross_profit:,.2f}"],
        ['Total Operating Expenses', f"PHP {total_exp:,.2f}"],
        ['Net Business Profit', f"PHP {net_profit:,.2f}"],
    ]

    t_summary = Table(summary_data, colWidths=[280, 240])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B170B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E9D8B8')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FFF9DF')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(Paragraph("Financial Performance Overview", h2_style))
    elements.append(t_summary)
    elements.append(Spacer(1, 15))

    # Low stock alerts table
    low_stock_items = [ing for ing in Ingredient.objects.all() if ing.stock_status in ['LOW', 'OUT_OF_STOCK']]
    elements.append(Paragraph("Inventory Alerts & Reorder Status", h2_style))

    if low_stock_items:
        alert_data = [['Ingredient', 'Supplier', 'Current Stock', 'Reorder Level', 'Status']]
        for ing in low_stock_items:
            alert_data.append([
                ing.name,
                ing.supplier.name if ing.supplier else (ing.supplier_name_raw or 'N/A'),
                f"{ing.current_stock:,.1f} {ing.unit}",
                f"{ing.reorder_level:,.1f} {ing.unit}",
                ing.stock_status
            ])
        t_alert = Table(alert_data, colWidths=[140, 140, 90, 90, 60])
        t_alert.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#A97845')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E9D8B8')),
        ]))
        elements.append(t_alert)
    else:
        elements.append(Paragraph("All ingredients are currently at healthy stock levels.", styles['Normal']))

    # Customer Orders & Receivables Table
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("Active Customer Orders & Accounts Receivable", h2_style))
    open_orders = CustomerInquiry.objects.exclude(status='CANCELLED').order_by('-created_at')[:8]
    if open_orders.exists():
        ord_data = [['Order Ref', 'Customer', 'Target Date', 'Total', 'Paid', 'Balance', 'Status']]
        for o in open_orders:
            ord_data.append([
                o.shared_order_number or o.inquiry_number,
                o.customer_name[:18],
                o.target_date.strftime('%Y-%m-%d') if o.target_date else 'Immediate',
                f"₱{float(o.estimated_total):,.2f}",
                f"₱{float(o.amount_paid):,.2f}",
                f"₱{float(o.remaining_balance):,.2f}",
                o.payment_status
            ])
        t_ord = Table(ord_data, colWidths=[90, 110, 75, 75, 75, 75, 70])
        t_ord.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B170B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E9D8B8')),
        ]))
        elements.append(t_ord)
    else:
        elements.append(Paragraph("No active open orders.", styles['Normal']))

    doc.build(elements)
    buffer.seek(0)

    filename = f"CRAVEABLES-Financial-Report-{timezone.now().strftime('%Y%m%d')}.pdf"
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

