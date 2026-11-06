from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'orders', views.ProductionOrderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

