from django.contrib import admin
from .models import BusinessSettings

@admin.register(BusinessSettings)
class BusinessSettingsAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'currency_symbol', 'contact_email', 'updated_at')

