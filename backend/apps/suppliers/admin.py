from django.contrib import admin
from .models import Supplier, PurchaseOrder, PurchaseItem

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'phone', 'email')
    search_fields = ('name', 'contact_person')

class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 1

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'supplier', 'purchase_date', 'status', 'total_amount')
    list_filter = ('status', 'purchase_date')
    inlines = [PurchaseItemInline]

