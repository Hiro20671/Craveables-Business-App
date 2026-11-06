from django.db import models

class BusinessSettings(models.Model):
    business_name = models.CharField(max_length=150, default='CRAVEABLES')
    tagline = models.CharField(max_length=255, default='Freshly Baked Treats & Artisanal Delights')
    currency_symbol = models.CharField(max_length=10, default='₱')
    currency_code = models.CharField(max_length=10, default='PHP')
    contact_phone = models.CharField(max_length=50, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='hello@craveables.ph')
    address = models.TextField(blank=True, default='')
    logo_path = models.CharField(max_length=255, default='/logo.png')
    default_reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=200.00)
    default_minimum_stock = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    default_target_margin = models.DecimalField(max_digits=5, decimal_places=2, default=30.00)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Business Settings'

    def __str__(self):
        return self.business_name

