from django.contrib import admin
from .models import PackagingItem, Recipe, RecipeIngredient, RecipePackaging

@admin.register(PackagingItem)
class PackagingItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'cost', 'quantity', 'cost_per_unit', 'default_needed_per_batch')

class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1

class RecipePackagingInline(admin.TabularInline):
    model = RecipePackaging
    extra = 1

@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('name', 'product_variant', 'batch_yield', 'calculated_cost_per_unit', 'selling_price', 'profit_per_unit')
    inlines = [RecipeIngredientInline, RecipePackagingInline]

