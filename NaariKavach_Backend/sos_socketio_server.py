import socketio
import eventlet
import os
import json
import requests
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('sos_socketio')

# Create a Socket.IO server
sio = socketio.Server(cors_allowed_origins='*')

# Create WSGI app
app = socketio.WSGIApp(sio)

# Base URL for API calls (adjust this to your actual API base URL)
API_BASE_URL = 'http://localhost:8000'  # Adjust this to your Django server URL


@sio.event
def connect(sid, environ):
    """Handle client connection"""
    logger.info(f'Client connected: {sid}')
    sio.emit('connection_established', {'message': 'Connected to SOS WebSocket server'}, to=sid)


@sio.event
def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f'Client disconnected: {sid}')


@sio.event
def create_sos(sid, data):
    """
    Handle SOS creation request
    Expected data: {
        'name': str,
        'sos_type': int (default: 0),
        'initial_latitude': float,
        'initial_longitude': float
    }
    """
    try:
        # Parse data if it's a string
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                sio.emit('create_sos_response', {
                    'success': False,
                    'error': 'Invalid JSON format'
                }, to=sid)
                return
        
        # Ensure data is a dictionary
        if not isinstance(data, dict):
            sio.emit('create_sos_response', {
                'success': False,
                'error': 'Data must be a JSON object'
            }, to=sid)
            return
        
        # Validate required fields
        required_fields = ['name', 'initial_latitude', 'initial_longitude']
        for field in required_fields:
            if field not in data:
                sio.emit('create_sos_response', {
                    'success': False,
                    'error': f'Missing required field: {field}'
                }, to=sid)
                return
        
        # Prepare data for API call
        api_data = {
            'name': data['name'],
            'sos_type': data.get('sos_type', 0),  # Default to 0 if not provided
            'initial_latitude': data['initial_latitude'],
            'initial_longitude': data['initial_longitude']
        }
        
        logger.info(f'Creating SOS for client {sid}: {api_data}')
        
        # Make HTTP POST request to Django API
        response = requests.post(
            f'{API_BASE_URL}/api/create-sos/',
            json=api_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        # Parse response
        if response.status_code == 200 or response.status_code == 201:
            response_data = response.json()
            sio.emit('create_sos_response', {
                'success': True,
                'data': response_data
            }, to=sid)
            logger.info(f'SOS created successfully for client {sid}: {response_data}')
        else:
            error_message = f'API request failed with status {response.status_code}'
            try:
                error_data = response.json()
                error_message = error_data.get('error', error_message)
            except:
                pass
            
            sio.emit('create_sos_response', {
                'success': False,
                'error': error_message,
                'status_code': response.status_code
            }, to=sid)
            logger.error(f'Failed to create SOS for client {sid}: {error_message}')
            
    except requests.exceptions.RequestException as e:
        sio.emit('create_sos_response', {
            'success': False,
            'error': f'Network error: {str(e)}'
        }, to=sid)
        logger.error(f'Network error creating SOS for client {sid}: {str(e)}')
        
    except Exception as e:
        sio.emit('create_sos_response', {
            'success': False,
            'error': f'Server error: {str(e)}'
        }, to=sid)
        logger.error(f'Unexpected error creating SOS for client {sid}: {str(e)}')


@sio.event
def update_location(sid, data):
    """
    Handle location update request
    Expected data: {
        'sos_request': int/str (SOS ID),
        'latitude': float,
        'longitude': float
    }
    """
    try:
        # Parse data if it's a string
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                sio.emit('update_location_response', {
                    'success': False,
                    'error': 'Invalid JSON format'
                }, to=sid)
                return
        
        # Ensure data is a dictionary
        if not isinstance(data, dict):
            sio.emit('update_location_response', {
                'success': False,
                'error': 'Data must be a JSON object'
            }, to=sid)
            return
        
        # Validate required fields
        required_fields = ['sos_request', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                sio.emit('update_location_response', {
                    'success': False,
                    'error': f'Missing required field: {field}'
                }, to=sid)
                return
        
        # Prepare data for API call
        api_data = {
            'sos_request': data['sos_request'],
            'latitude': data['latitude'],
            'longitude': data['longitude']
        }
        
        logger.info(f'Updating location for client {sid}: {api_data}')
        
        # Make HTTP POST request to Django API
        response = requests.post(
            f'{API_BASE_URL}/api/update-location/',
            json=api_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        # Parse response
        if response.status_code == 200 or response.status_code == 201:
            response_data = response.json()
            sio.emit('update_location_response', {
                'success': True,
                'data': response_data
            }, to=sid)
            logger.info(f'Location updated successfully for client {sid}: {response_data}')
        else:
            error_message = f'API request failed with status {response.status_code}'
            try:
                error_data = response.json()
                error_message = error_data.get('error', error_message)
            except:
                pass
            
            sio.emit('update_location_response', {
                'success': False,
                'error': error_message,
                'status_code': response.status_code
            }, to=sid)
            logger.error(f'Failed to update location for client {sid}: {error_message}')
            
    except requests.exceptions.RequestException as e:
        sio.emit('update_location_response', {
            'success': False,
            'error': f'Network error: {str(e)}'
        }, to=sid)
        logger.error(f'Network error updating location for client {sid}: {str(e)}')
        
    except Exception as e:
        sio.emit('update_location_response', {
            'success': False,
            'error': f'Server error: {str(e)}'
        }, to=sid)
        logger.error(f'Unexpected error updating location for client {sid}: {str(e)}')


if __name__ == '__main__':
    # Start the server
    port = int(os.environ.get('SOS_SOCKETIO_PORT', 8002))  # Different port from main socketio server
    print(f'Starting SOS Socket.IO server on port {port}...')
    logger.info(f'SOS Socket.IO server starting on port {port}')
    eventlet.wsgi.server(eventlet.listen(('', port)), app)
