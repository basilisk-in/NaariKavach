import socketio
import eventlet
import json
import django
import os
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('socketio')

# Initialize Django to be able to use Django models
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import SOS, LocationUpdate, OfficerAssignment
from django.contrib.auth.models import User
from django.utils import timezone

# Create a Socket.IO server
sio = socketio.Server(cors_allowed_origins='*')

# Create WSGI app
app = socketio.WSGIApp(sio)

# In-memory data structures
# Store connected users and their rooms
connected_users = {}  # {session_id: {'type': 'admin/officer', 'rooms': [room_id1, room_id2], 'unit_number': unit_number}}
officer_units = {}  # {unit_number: [session_ids]}
location_updates = {}  # {room_id: [location_updates]}


# Utility functions
def add_location_update(room_id, location_data):
    """Add location update to room history"""
    if room_id not in location_updates:
        location_updates[room_id] = []
    location_updates[room_id].append(location_data)

def get_sos_by_id(sos_id):
    """Get SOS object by ID"""
    try:
        return SOS.objects.get(id=sos_id)
    except SOS.DoesNotExist:
        return None


# Socket.IO event handlers
@sio.event
def connect(sid, environ):
    """Handle client connection"""
    logger.info(f'Client connected: {sid}')
    sio.emit('connection_established', {'message': 'Connected to server'}, to=sid)

@sio.event
def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f'Client disconnected: {sid}')
    
    # Clean up user data if it exists
    if sid in connected_users:
        user_data = connected_users[sid]
        # If it's an officer, remove from unit mapping
        if user_data.get('type') == 'officer' and user_data.get('unit_number'):
            unit_number = user_data['unit_number']
            if unit_number in officer_units and sid in officer_units[unit_number]:
                officer_units[unit_number].remove(sid)
                if not officer_units[unit_number]:  # Remove empty list
                    del officer_units[unit_number]
        del connected_users[sid]

@sio.event
def join_sos_room(sid, data):
    """Join a specific SOS room"""
    # Handle both string and dict inputs
    if isinstance(data, str):
        room_id = data
    elif isinstance(data, dict):
        room_id = data.get('room_id')
    else:
        sio.emit('error', {'message': 'Invalid data format'}, to=sid)
        return
    
    if not room_id:
        sio.emit('error', {'message': 'Room ID is required'}, to=sid)
        return
    
    sio.enter_room(sid, f'sos_{room_id}')
    logger.info(f'Client {sid} joined SOS room: sos_{room_id}')
    sio.emit('room_joined', {'room_id': room_id, 'message': f'Joined SOS room {room_id}'}, to=sid)
    
    # Send any existing location updates for this room
    if room_id in location_updates:
        sio.emit('location_history', {'updates': location_updates[room_id]}, to=sid)

@sio.event
def join_officer_room(sid, data):
    """Officers join rooms based on their unit number"""
    # Handle both string and dict inputs
    if isinstance(data, str):
        unit_number = data
    elif isinstance(data, dict):
        unit_number = data.get('unit_number')
    else:
        sio.emit('error', {'message': 'Invalid data format'}, to=sid)
        return
    
    if not unit_number:
        sio.emit('error', {'message': 'Unit number is required'}, to=sid)
        return
    
    # Store officer data
    connected_users[sid] = {
        'type': 'officer',
        'unit_number': unit_number,
        'rooms': []
    }
    
    # Add to unit mapping
    if unit_number not in officer_units:
        officer_units[unit_number] = []
    if sid not in officer_units[unit_number]:
        officer_units[unit_number].append(sid)
    
    # Join unit room
    sio.enter_room(sid, f'unit_{unit_number}')
    logger.info(f'Officer {sid} joined unit room: unit_{unit_number}')
    sio.emit('room_joined', {'unit_number': unit_number, 'message': f'Joined unit room {unit_number}'}, to=sid)

@sio.event
def join_sos_channel(sid, data):
    """Join the main SOS channel to receive all SOS creation notifications"""
    sio.enter_room(sid, 'sos_channel')
    logger.info(f'Client {sid} joined SOS channel')
    sio.emit('room_joined', {'channel': 'sos_channel', 'message': 'Joined SOS channel'}, to=sid)

# Events triggered by Django API
@sio.event
def sos_created(sid, data):
    """Handle SOS creation from Django API"""
    # Broadcast new SOS to SOS channel subscribers
    sio.emit('new_sos', data, room='sos_channel')
    logger.info(f'New SOS created: {data.get("sos_id")} - broadcast to SOS channel')

@sio.event
def location_update_to_room(sid, data):
    """Handle location update to specific room from Django API"""
    room_id = data.get('room_id')
    if room_id:
        # Add to location history
        add_location_update(room_id, {
            'sos_id': data.get('sos_id'),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'timestamp': data.get('timestamp')
        })
        
        # Emit to specific SOS room
        sio.emit('location_history', {
            'sos_id': data.get('sos_id'),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'timestamp': data.get('timestamp')
        }, room=f'sos_{room_id}')
        
        logger.info(f'Location update sent to room: sos_{room_id}')

@sio.event
def location_update_to_unit(sid, data):
    """Handle location update to specific unit from Django API"""
    unit_number = data.get('unit_number')
    if unit_number:
        # Emit to unit room
        sio.emit('unit_location_update', {
            'sos_id': data.get('sos_id'),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'timestamp': data.get('timestamp')
        }, room=f'unit_{unit_number}')
        
        # Also emit to a general location tracking channel
        sio.emit('location_tracking_update', {
            'unit_number': unit_number,
            'sos_id': data.get('sos_id'),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'timestamp': data.get('timestamp')
        }, room='location_tracking_channel')
        
        logger.info(f'Location update sent to unit: unit_{unit_number}')

@sio.event
def join_location_tracking_channel(sid, data):
    """Join the location tracking channel to receive all unit location updates"""
    sio.enter_room(sid, 'location_tracking_channel')
    logger.info(f'Client {sid} joined location tracking channel')
    sio.emit('room_joined', {'channel': 'location_tracking_channel', 'message': 'Joined location tracking channel'}, to=sid)

@sio.event
def officer_location_update(sid, data):
    logger.info(f'Client {sid} joined location tracking channel')
    sio.emit('unit_loc', data, room='location_tracking_channel')

@sio.event
def join_officer_update(sid, data):
    """Join the location tracking channel to receive all unit location updates"""
    sio.enter_room(sid, 'location_tracking_channel')
    logger.info(f'Client {sid} joined location tracking channel')
    sio.emit('room_joined', {'channel': 'location_tracking_channel', 'message': 'Joined location tracking channel'}, to=sid)


if __name__ == '__main__':
    # Start the server
    port = int(os.environ.get('PORT', 8001))
    print(f'Starting Socket.IO server on port {port}...')
    eventlet.wsgi.server(eventlet.listen(('', port)), app)
