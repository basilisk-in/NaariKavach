from rest_framework import serializers
from .models import SOS, OfficerAssignment, LocationUpdate, SOSImage
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

class SOSImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSImage
        fields = ('id', 'sos_request', 'image', 'image_url', 'description', 'uploaded_at')
        read_only_fields = ('uploaded_at',)
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

class SOSSerializer(serializers.ModelSerializer):
    location_updates = LocationUpdateSerializer(many=True, read_only=True)
    officer_assignments = OfficerAssignmentSerializer(many=True, read_only=True)
    images = SOSImageSerializer(many=True, read_only=True)
    
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

class SOSImageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOSImage
        fields = ('sos_request', 'image', 'description')
