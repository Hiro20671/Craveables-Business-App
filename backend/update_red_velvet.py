import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.products.models import Product, ProductVariant
from apps.costing.models import Recipe, RecipeIngredient
from apps.inventory.models import Ingredient
from apps.suppliers.models import Supplier

def update_catalog():
    print("Updating Catalog to match new Excel sheet...")

    # 1. Update/Create Red Food Coloring
    supplier, _ = Supplier.objects.get_or_create(
        name='Baking Store',
        defaults={'contact_person': 'Baking Supplies', 'category': 'Baking Supplies'}
    )

    food_color = Ingredient.objects.filter(name__icontains='color').first()
    if not food_color:
        food_color = Ingredient(name='Red Food Coloring')
    else:
        food_color.name = 'Red Food Coloring'

    food_color.supplier = supplier
    food_color.supplier_name_raw = 'Baking Store'
    food_color.purchase_cost = Decimal('30.00')
    food_color.package_size = Decimal('30.00')
    food_color.unit = 'g'
    food_color.cost_per_unit = Decimal('1.0000')
    food_color.current_stock = Decimal('30.00')
    food_color.minimum_stock_level = Decimal('10.00')
    food_color.reorder_level = Decimal('15.00')
    food_color.save()
    print(f"Updated Ingredient: {food_color.name} (Stock: {food_color.current_stock}{food_color.unit}, Cost: ₱{food_color.cost_per_unit}/unit)")

    # 2. Update Cookies product & variants
    cookies_prod, _ = Product.objects.get_or_create(name='Cookies')

    # Remove or update Triple Choco variants
    triple_choco_box = ProductVariant.objects.filter(product=cookies_prod, name__icontains='Triple Choco Box').first()
    if triple_choco_box:
        triple_choco_box.name = 'Red Velvet Cookies'
        triple_choco_box.sku = 'CK-RED-VELVET'
        triple_choco_box.selling_price = Decimal('210.00')
        triple_choco_box.batch_yield = 2
        triple_choco_box.save()
        red_velvet_var = triple_choco_box
        print("Renamed 'Triple Choco Box' variant to 'Red Velvet Cookies'")
    else:
        red_velvet_var, _ = ProductVariant.objects.get_or_create(
            product=cookies_prod,
            name='Red Velvet Cookies',
            defaults={
                'sku': 'CK-RED-VELVET',
                'selling_price': Decimal('210.00'),
                'batch_yield': 2
            }
        )
        print("Created variant 'Red Velvet Cookies'")

    # Delete Triple Choco Solo if exists
    ProductVariant.objects.filter(product=cookies_prod, name__icontains='Triple Choco Solo').delete()
    print("Cleaned up Triple Choco Solo variant.")

    # 3. Create / Update Recipe for Red Velvet Cookies
    recipe, _ = Recipe.objects.get_or_create(
        product_variant=red_velvet_var,
        defaults={'name': 'Cookies — Red Velvet Cookies'}
    )
    recipe.name = 'Cookies — Red Velvet Cookies'
    recipe.batch_yield = 2
    recipe.batch_size_desc = 'Box of 6'
    recipe.packaging_cost = Decimal('3.4250')
    recipe.shipping_cost = Decimal('0.00')
    recipe.electricity_cost = Decimal('70.00')
    recipe.labor_cost = Decimal('50.00')
    recipe.notes = 'Signature Red Velvet Cookies with ruby cocoa and Belgian chocolate chips.'
    recipe.save()

    # Clear old ingredients and link new ones
    recipe.recipe_ingredients.all().delete()

    recipe_items = [
        ('Flour', Decimal('480.00'), 'g'),
        ('Cocoa', Decimal('60.00'), 'g'),
        ('White Sugar', Decimal('120.00'), 'g'),
        ('Brown Sugar', Decimal('120.00'), 'g'),
        ('Salt', Decimal('2.50'), 'g'),
        ('Dark Compound', Decimal('60.00'), 'g'),
        ('Chocolate Chip', Decimal('50.00'), 'g'),
        ('Butter', Decimal('100.00'), 'g'),
        ('Eggs', Decimal('1.00'), 'pcs'),
        ('Red Food Coloring', Decimal('5.00'), 'g'),
        ('Vanilla Extract', Decimal('10.00'), 'ml'),
    ]

    for ing_name, qty, unit in recipe_items:
        ing = Ingredient.objects.filter(name__iexact=ing_name).first()
        if not ing:
            ing = Ingredient.objects.filter(name__icontains=ing_name).first()
        if ing:
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ing,
                quantity_used=qty,
                unit=unit
            )
            print(f"  + Added to Red Velvet Recipe: {ing.name} ({qty}{unit})")
        else:
            print(f"  ! Warning: Ingredient '{ing_name}' not found!")

    print(f"\nRecipe successfully configured: {recipe.name}")
    print(f"Batch Yield: {recipe.batch_yield} units | Total Ingredient Cost: ₱{recipe.total_ingredient_cost:.2f}")
    print(f"Total Batch Cost: ₱{recipe.total_batch_cost:.2f} | Cost/Unit: ₱{recipe.calculated_cost_per_unit:.2f}")
    print(f"Selling Price: ₱{recipe.selling_price:.2f} | Profit/Unit: ₱{recipe.profit_per_unit:.2f} ({recipe.profit_margin_percentage:.1f}%)")

if __name__ == '__main__':
    update_catalog()
