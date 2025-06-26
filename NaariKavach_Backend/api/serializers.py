from rest_framework import serializers
from .models import SOS, OfficerAssignment, LocationUpdate
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')

class LocationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationUpdate
        fields = '__all__'

class OfficerAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfficerAssignment
        fields = '__all__'

class SOSSerializer(serializers.ModelSerializer):
    location_updates = LocationUpdateSerializer(many=True, read_only=True)
    officer_assignments = OfficerAssignmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = SOS
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

class SOSCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOS
        fields = ('name', 'sos_type', 'initial_latitude', 'initial_longitude')

class LocationUpdateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationUpdate
        fields = ('sos_request', 'latitude', 'longitude')

class OfficerAssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfficerAssignment
        fields = ('sos_request', 'officer_name', 'unit_number')
