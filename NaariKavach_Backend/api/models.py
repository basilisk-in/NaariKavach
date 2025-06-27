from django.db import models
from django.contrib.auth.models import User
import os

class SOS(models.Model):
    # SOS types
    SOS_TYPES = (
        (0, 'Emergency'),
        (1, 'Alert'),
    )
    
    # Status flags
    STATUS_FLAGS = (
        (0, 'Unresolved'),
        (1, 'Resolved'),
    )
    
    # Acknowledgment flags
    ACK_FLAGS = (
        (0, 'Not Acknowledged'),
        (1, 'Acknowledged'),
    )
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    sos_type = models.IntegerField(choices=SOS_TYPES, default=0)
    status_flag = models.IntegerField(choices=STATUS_FLAGS, default=0)
    initial_latitude = models.FloatField()
    initial_longitude = models.FloatField()
    unit_number_dispatched = models.CharField(max_length=50, blank=True, null=True)
    acknowledged_flag = models.IntegerField(choices=ACK_FLAGS, default=0)
    room_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"SOS {self.id} - {self.name} ({self.get_sos_type_display()})"
    
    class Meta:
        verbose_name = "SOS"
        verbose_name_plural = "SOS Requests"

class OfficerAssignment(models.Model):
    sos_request = models.ForeignKey(SOS, on_delete=models.CASCADE, related_name='officer_assignments')
    officer_name = models.CharField(max_length=255)
    unit_number = models.CharField(max_length=50)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Officer: {self.officer_name} - Unit: {self.unit_number} - SOS: {self.sos_request.id}"

class LocationUpdate(models.Model):
    sos_request = models.ForeignKey(SOS, on_delete=models.CASCADE, related_name='location_updates')
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Location Update for SOS {self.sos_request.id} at {self.timestamp}"

class SOSImage(models.Model):
    sos_request = models.ForeignKey(SOS, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='sos_images/')
    description = models.CharField(max_length=255, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for SOS {self.sos_request.id} - {self.image.name}"
    
    def delete(self, *args, **kwargs):
        # Delete the image file when the model instance is deleted
        if self.image:
            if os.path.isfile(self.image.path):
                os.remove(self.image.path)
        super().delete(*args, **kwargs)

    class Meta:
        verbose_name = "SOS Image"
        verbose_name_plural = "SOS Images"
