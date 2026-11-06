from django.contrib import admin
from .models import Ingredient, StockTransaction

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'supplier', 'current_stock', 'unit', 'cost_per_unit', 'stock_value', 'stock_status')
    search_fields = ('name', 'supplier__name')
    list_filter = ('unit',)

@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ('ingredient', 'transaction_type', 'quantity_change', 'previous_stock', 'new_stock', 'created_at')
    list_filter = ('transaction_type', 'created_at')

