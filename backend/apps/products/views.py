from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Category, Product, ProductVariant
from .serializers import CategorySerializer, ProductSerializer, ProductVariantSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().prefetch_related('variants', 'category').order_by('name')
    serializer_class = ProductSerializer

    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate_product(self, request, pk=None):
        product = self.get_object()
        new_product = Product.objects.create(
            name=f"{product.name} (Copy)",
            category=product.category,
            description=product.description,
            image_url=product.image_url,
            status='ACTIVE'
        )
        for variant in product.variants.all():
            ProductVariant.objects.create(
                product=new_product,
                name=variant.name,
                sku=f"{variant.sku}-copy" if variant.sku else '',
                selling_price=variant.selling_price,
                batch_yield=variant.batch_yield,
                current_finished_stock=0
            )
        serializer = self.get_serializer(new_product)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all().select_related('product', 'product__category').order_by('product__name', 'name')
    serializer_class = ProductVariantSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

