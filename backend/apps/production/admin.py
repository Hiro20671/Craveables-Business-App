from django.contrib import admin
from .models import ProductionOrder, ProductionIngredientUsage

class ProductionIngredientUsageInline(admin.TabularInline):
    model = ProductionIngredientUsage
    extra = 0

@admin.register(ProductionOrder)
class ProductionOrderAdmin(admin.ModelAdmin):
    list_display = ('production_number', 'product_variant', 'batches_count', 'actual_yield', 'status', 'production_date')
    list_filter = ('status', 'production_date')
    inlines = [ProductionIngredientUsageInline]

