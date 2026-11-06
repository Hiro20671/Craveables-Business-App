from rest_framework import serializers
from .models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'date', 'category', 'description', 'amount',
            'payment_method', 'receipt_reference', 'notes',
            'created_by', 'created_by_name', 'created_at'
        ]

