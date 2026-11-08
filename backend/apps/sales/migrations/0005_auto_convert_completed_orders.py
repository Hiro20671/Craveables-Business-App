from django.db import migrations
from decimal import Decimal

def auto_convert_completed_inquiries(apps, schema_editor):
    CustomerInquiry = apps.get_model('sales', 'CustomerInquiry')
    SaleOrder = apps.get_model('sales', 'SaleOrder')
    SaleItem = apps.get_model('sales', 'SaleItem')
    ProductVariant = apps.get_model('products', 'ProductVariant')

    completed_inquiries = CustomerInquiry.objects.filter(status='COMPLETED', converted_sale__isnull=True)
    for inq in completed_inquiries:
        sale_receipt = inq.shared_order_number or inq.inquiry_number
        sale_order, created = SaleOrder.objects.get_or_create(
            receipt_number=sale_receipt,
            defaults={
                'sale_date': inq.target_date or inq.created_at.date(),
                'customer': inq.customer,
                'customer_name': inq.customer_name or 'Valued Customer',
                'payment_method': 'GCASH' if 'gcash' in str(inq.payment_type).lower() else 'CASH',
                'subtotal': inq.estimated_total,
                'discount': Decimal('0.00'),
                'total_sales': inq.estimated_total,
                'total_cogs': Decimal('0.00'),
                'gross_profit': inq.estimated_total,
                'notes': f"Completed Order {sale_receipt}. {inq.notes}".strip(),
            }
        )

        total_cogs = Decimal('0.00')
        items = inq.items_json or []
        for item in items:
            name = item.get('name', '')
            qty = int(item.get('qty', 1))
            price = Decimal(str(item.get('price', '0.00')))

            variant = ProductVariant.objects.filter(name__icontains=name.split('—')[0].strip()).first()
            if not variant:
                variant = ProductVariant.objects.first()

            unit_cost = Decimal('0.0000')
            if variant and hasattr(variant, 'recipe') and variant.recipe:
                unit_cost = getattr(variant.recipe, 'calculated_cost_per_unit', Decimal('0.0000'))

            item_cost = unit_cost * Decimal(str(qty))
            total_cogs += item_cost

            if variant:
                SaleItem.objects.create(
                    sale_order=sale_order,
                    product_variant=variant,
                    quantity=qty,
                    selling_price=price if price > 0 else variant.selling_price,
                    discount=Decimal('0.00'),
                    historical_unit_cost=unit_cost
                )

        sale_order.total_cogs = total_cogs
        sale_order.gross_profit = max(Decimal('0.00'), sale_order.total_sales - total_cogs)
        sale_order.save()

        inq.converted_sale = sale_order
        inq.save(update_fields=['converted_sale'])

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0004_customer_featuredorder_customerinquiry_amount_paid_and_more'),
    ]

    operations = [
        migrations.RunPython(auto_convert_completed_inquiries, reverse_func),
    ]

