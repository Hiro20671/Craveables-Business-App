from django.urls import path
from . import views

urlpatterns = [
    path('dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
    path('profit-loss/', views.profit_loss_report, name='profit_loss_report'),
    path('export/excel/', views.export_excel_report, name='export_excel'),
    path('export/pdf/', views.export_pdf_report, name='export_pdf'),
]

