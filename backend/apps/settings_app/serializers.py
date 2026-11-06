from rest_framework import serializers
from .models import BusinessSettings

class BusinessSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessSettings
        fields = '__all__'

