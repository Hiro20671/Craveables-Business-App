from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from .models import Expense
from .serializers import ExpenseSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date', '-id')
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        search = self.request.query_params.get('search')

        if category:
            qs = qs.filter(category=category)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if search:
            qs = qs.filter(description__icontains=search) | qs.filter(receipt_reference__icontains=search)
        return qs

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        qs = self.get_queryset()
        total_amount = qs.aggregate(total=Sum('amount'))['total'] or 0.00
        by_category = qs.values('category').annotate(
            total=Sum('amount'), count=Count('id')
        ).order_by('-total')

        return Response({
            'total_expenses': total_amount,
            'by_category': list(by_category)
        })

