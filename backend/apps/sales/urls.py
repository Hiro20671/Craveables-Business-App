from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'orders', views.SaleOrderViewSet)
router.register(r'inquiries', views.CustomerInquiryViewSet)
router.register(r'reviews', views.CustomerReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

