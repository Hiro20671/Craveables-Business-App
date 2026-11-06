from django.contrib import admin
from .models import SaleOrder, SaleItem

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0

@admin.register(SaleOrder)
class SaleOrderAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'sale_date', 'customer_name', 'payment_method', 'total_sales', 'gross_profit')
    list_filter = ('payment_method', 'sale_date')
    search_fields = ('receipt_number', 'customer_name')
    inlines = [SaleItemInline]

