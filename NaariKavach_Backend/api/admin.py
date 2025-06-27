# Admin interface disabled for this backend-only API system
# All management is done through the REST API endpoints
from .models import SOS, OfficerAssignment, LocationUpdate, SOSImage
from django.contrib import admin

admin.site.register(SOS)
admin.site.register(OfficerAssignment)
admin.site.register(LocationUpdate)
admin.site.register(SOSImage)
