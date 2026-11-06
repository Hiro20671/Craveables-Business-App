from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import BusinessSettings
from .serializers import BusinessSettingsSerializer

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

