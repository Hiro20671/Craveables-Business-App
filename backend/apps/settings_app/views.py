import io
import json
import tempfile
from django.core.management import call_command
from django.http import HttpResponse, JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import BusinessSettings
from .serializers import BusinessSettingsSerializer
from apps.sales.models import CustomerInquiry, InquiryStatus


@api_view(['GET', 'POST', 'PUT'])
def business_settings(request):
    settings_obj, _ = BusinessSettings.objects.get_or_create(id=1)
    if request.method in ['POST', 'PUT']:
        serializer = BusinessSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer = BusinessSettingsSerializer(settings_obj)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def export_database(request):
    """
    Exports full live database (orders, sales, inventory, recipes, customers, payments)
    as a downloadable JSON file for easy sync between deployed server and localhost.
    """
    buffer = io.StringIO()
    call_command(
        'dumpdata',
        '--natural-foreign',
        '--natural-primary',
        exclude=['contenttypes', 'auth.permission'],
        indent=2,
        stdout=buffer
    )
    json_data = buffer.getvalue()
    response = HttpResponse(json_data, content_type='application/json')
    response['Content-Disposition'] = 'attachment; filename="craveables_live_data.json"'
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def import_database(request):
    """
    Imports a JSON backup into the current database and triggers completed orders backfill.
    """
    try:
        if 'file' in request.FILES:
            raw_data = request.FILES['file'].read().decode('utf-8')
        elif isinstance(request.data, (list, dict)):
            raw_data = json.dumps(request.data)
        else:
            raw_data = request.body.decode('utf-8')

        with tempfile.NamedTemporaryFile(suffix='.json', mode='w', encoding='utf-8', delete=False) as tf:
            tf.write(raw_data)
            temp_path = tf.name

        call_command('loaddata', temp_path)

        # Trigger auto-conversion of any completed customer orders into sales
        for inq in CustomerInquiry.objects.filter(status=InquiryStatus.COMPLETED, converted_sale__isnull=True):
            try:
                inq.auto_create_sale_order()
            except Exception:
                pass

        return Response({
            'detail': 'Successfully loaded live database records into system!',
            'orders_count': CustomerInquiry.objects.count(),
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'detail': f'Error importing data: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
