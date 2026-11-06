from django.urls import path
from . import views

urlpatterns = [
    path('general/', views.business_settings, name='business_settings'),
]

