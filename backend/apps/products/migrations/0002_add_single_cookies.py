from django.db import migrations
from decimal import Decimal

def add_single_cookies_and_recipes(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    ProductVariant = apps.get_model('products', 'ProductVariant')
    Recipe = apps.get_model('costing', 'Recipe')
    RecipeIngredient = apps.get_model('costing', 'RecipeIngredient')

    cookie_product = Product.objects.filter(name__icontains='Cookies').first()
    if not cookie_product:
        return

    # 1. Classic Choco Chip Cookie Single (₱30.00)
    choco_single, created = ProductVariant.objects.get_or_create(
        product=cookie_product,
        name='Classic Choco Chip Cookie (Single pc)',
        defaults={
            'sku': 'CK-CHIP-SINGLE',
            'selling_price': Decimal('30.00'),
            'batch_yield': 12,
            'current_finished_stock': Decimal('0.00'),
            'is_active': True,
        }
    )
    if not created and choco_single.selling_price != Decimal('30.00'):
        choco_single.selling_price = Decimal('30.00')
        choco_single.save()

    # Recipe for Classic Choco Chip Cookie Single (Yield: 12)
    source_choco_recipe = Recipe.objects.filter(product_variant__name__icontains='Choco Chip Box').first()
    if source_choco_recipe and not Recipe.objects.filter(product_variant=choco_single).exists():
        recipe_single = Recipe.objects.create(
            product_variant=choco_single,
            name='Cookies — Classic Choco Chip (Single pc)',
            batch_yield=12,
            batch_size_desc='12 individual cookies',
            packaging_cost=Decimal('3.4250'),
            electricity_cost=Decimal('70.00'),
            labor_cost=Decimal('50.00'),
            shipping_cost=Decimal('0.00'),
            notes='Single piece cookies (12 pcs yield per standard batch).'
        )
        for ri in source_choco_recipe.recipe_ingredients.all():
            RecipeIngredient.objects.create(
                recipe=recipe_single,
                ingredient=ri.ingredient,
                quantity_used=ri.quantity_used,
                unit=ri.unit
            )

    # 2. Red Velvet Cookie Single (₱35.00)
    red_single, created = ProductVariant.objects.get_or_create(
        product=cookie_product,
        name='Red Velvet Cookie (Single pc)',
        defaults={
            'sku': 'CK-RED-SINGLE',
            'selling_price': Decimal('35.00'),
            'batch_yield': 12,
            'current_finished_stock': Decimal('0.00'),
            'is_active': True,
        }
    )
    if not created and red_single.selling_price != Decimal('35.00'):
        red_single.selling_price = Decimal('35.00')
        red_single.save()

    # Recipe for Red Velvet Cookie Single (Yield: 12)
    source_red_recipe = Recipe.objects.filter(product_variant__name__icontains='Red Velvet').first()
    if source_red_recipe and not Recipe.objects.filter(product_variant=red_single).exists():
        recipe_red = Recipe.objects.create(
            product_variant=red_single,
            name='Cookies — Red Velvet (Single pc)',
            batch_yield=12,
            batch_size_desc='12 individual cookies',
            packaging_cost=Decimal('3.4250'),
            electricity_cost=Decimal('70.00'),
            labor_cost=Decimal('50.00'),
            shipping_cost=Decimal('0.00'),
            notes='Single piece Red Velvet cookies (12 pcs yield per standard batch).'
        )
        for ri in source_red_recipe.recipe_ingredients.all():
            RecipeIngredient.objects.create(
                recipe=recipe_red,
                ingredient=ri.ingredient,
                quantity_used=ri.quantity_used,
                unit=ri.unit
            )

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
        ('costing', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_single_cookies_and_recipes, reverse_func),
    ]
