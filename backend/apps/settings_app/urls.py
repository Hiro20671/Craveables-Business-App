from django.urls import path
from . import views

urlpatterns = [
    path('general/', views.business_settings, name='business_settings'),
    path('export-db/', views.export_database, name='export_database'),
    path('import-db/', views.import_database, name='import_database'),
]
