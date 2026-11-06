from django.db import models
from django.contrib.auth.models import User

class ExpenseCategory(models.TextChoices):
    ELECTRICITY = 'Kuryente / Electricity', 'Kuryente / Electricity'
    PACKAGING = 'Packaging', 'Packaging'
    SHIPPING = 'Shipping Fee', 'Shipping Fee'
    TRANSPORTATION = 'Transportation', 'Transportation'
    INGREDIENTS = 'Ingredients', 'Ingredients'
    SUPPLIES = 'Supplies', 'Supplies'
    LABOR = 'Labor', 'Labor'
    OTHER = 'Other Expenses', 'Other Expenses'

class Expense(models.Model):
    date = models.DateField()
    category = models.CharField(max_length=60, choices=ExpenseCategory.choices, default=ExpenseCategory.OTHER)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Amount in Philippine Peso (₱)")
    payment_method = models.CharField(max_length=50, default='Cash')
    receipt_reference = models.CharField(max_length=100, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.date} - {self.category}: ₱{self.amount:.2f} ({self.description})"

