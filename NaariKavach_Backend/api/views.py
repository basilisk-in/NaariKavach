import uuid
import socketio
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.views import APIView

from .models import SOS, OfficerAssignment, LocationUpdate
from .serializers import (
    SOSSerializer, SOSCreateSerializer, 
    LocationUpdateSerializer, LocationUpdateCreateSerializer,
    OfficerAssignmentSerializer, OfficerAssignmentCreateSerializer
)

# Create Socket.IO client to emit events to our Socket.IO server
sio_client = socketio.SimpleClient()

def connect_to_socketio():
    """Connect to Socket.IO server if not already connected"""
    try:
        if not sio_client.connected:
            sio_client.connect('http://localhost:8001')
    except Exception as e:
        print(f"Failed to connect to Socket.IO server: {e}")

def emit_to_socketio(event, data):
    """Emit event to Socket.IO server"""
    try:
        connect_to_socketio()
        if sio_client.connected:
            sio_client.emit(event, data)
    except Exception as e:
        print(f"Failed to emit to Socket.IO: {e}")

class SOSViewSet(viewsets.ModelViewSet):
    queryset = SOS.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SOSCreateSerializer
        return SOSSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.AllowAny]  # Allow anonymous SOS creation
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        # Generate a unique room ID for this SOS
        room_id = str(uuid.uuid4())
        
        # Save SOS with current user if authenticated, otherwise save without user
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user, room_id=room_id)
        else:
            serializer.save(room_id=room_id)
            
        return Response({
            "status": "success",
            "message": "SOS created successfully",
            "room_id": room_id
        }, status=status.HTTP_201_CREATED)

class CreateSOSView(APIView):
    """
    API endpoint that allows creating SOS alerts without authentication
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = SOSCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Generate a unique room ID for this SOS
            room_id = str(uuid.uuid4())
            
            # Associate with user if authenticated
            if request.user.is_authenticated:
                sos = serializer.save(user=request.user, room_id=room_id)
            else:
                sos = serializer.save(room_id=room_id)
            
            # Emit to SOS channel when new SOS is created
            emit_to_socketio('sos_created', {
                'sos_id': sos.id,
                'room_id': room_id,
                'name': sos.name,
                'sos_type': sos.sos_type,
                'latitude': sos.initial_latitude,
                'longitude': sos.initial_longitude,
                'created_at': sos.created_at.isoformat()
            })
                
            # Return success with room_id for websocket connection
            return Response({
                "status": "success",
                "message": "SOS created successfully",
                "sos_id": sos.id,
                "room_id": room_id
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LocationUpdateView(APIView):
    """
    API endpoint to update location for an active SOS
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LocationUpdateCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            location_update = serializer.save()
            sos = location_update.sos_request
            
            # Emit location update to specific SOS room
            emit_to_socketio('location_update_to_room', {
                'room_id': sos.room_id,
                'sos_id': sos.id,
                'latitude': location_update.latitude,
                'longitude': location_update.longitude,
                'timestamp': location_update.timestamp.isoformat()
            })
            
            # If SOS has assigned unit, also emit to unit channel
            if sos.unit_number_dispatched:
                emit_to_socketio('location_update_to_unit', {
                    'unit_number': sos.unit_number_dispatched,
                    'sos_id': sos.id,
                    'latitude': location_update.latitude,
                    'longitude': location_update.longitude,
                    'timestamp': location_update.timestamp.isoformat()
                })
            
            return Response({"status": "Location updated successfully"}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AssignOfficerView(APIView):
    """
    API endpoint to assign an officer to an SOS
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = OfficerAssignmentCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Save the officer assignment
            officer_assignment = serializer.save()
            
            # Update the SOS record with unit number
            sos = officer_assignment.sos_request
            sos.unit_number_dispatched = officer_assignment.unit_number
            sos.acknowledged_flag = 1
            sos.save()
            
            return Response({
                "status": "Officer assigned successfully",
                "officer": OfficerAssignmentSerializer(officer_assignment).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResolveSOSView(APIView):
    """
    API endpoint to mark an SOS as resolved
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, sos_id):
        try:
            sos = SOS.objects.get(id=sos_id)
            sos.status_flag = 1  # Mark as resolved
            sos.save()
            
            return Response({
                "status": "SOS marked as resolved successfully",
                "sos": SOSSerializer(sos).data
            })
        except SOS.DoesNotExist:
            return Response({"error": "SOS not found"}, status=status.HTTP_404_NOT_FOUND)

class GetAllSOSView(APIView):
    """
    API endpoint to fetch all SOS entries from the database
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        try:
            # Get all SOS entries from the database
            sos_queryset = SOS.objects.all().order_by('-created_at')  # Order by newest first
            
            # Serialize the data
            serializer = SOSSerializer(sos_queryset, many=True)
            
            return Response({
                "status": "success",
                "message": "SOS entries fetched successfully",
                "count": sos_queryset.count(),
                "data": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Failed to fetch SOS entries: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
