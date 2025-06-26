from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from .models import SOS, LocationUpdate, OfficerAssignment
from rest_framework import status
import json
import uuid

class SOSAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword123',
            email='test@example.com'
        )
        
        # Create an admin user
        self.admin = User.objects.create_superuser(
            username='admin',
            password='admin123',
            email='admin@example.com'
        )

    def test_user_registration(self):
        data = {
            'username': 'newuser',
            'password': 'newpassword123',
            're_password': 'newpassword123',
            'email': 'new@example.com'
        }
        response = self.client.post('/auth/users/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_user_login(self):
        data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        response = self.client.post('/auth/jwt/create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_create_sos_unauthenticated(self):
        data = {
            'name': 'Test Person',
            'sos_type': 0,
            'initial_latitude': 28.7041,
            'initial_longitude': 77.1025
        }
        response = self.client.post('/api/create-sos/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('room_id', response.data)
        self.assertIn('sos_id', response.data)
    
    def test_create_sos_authenticated(self):
        self.client.force_authenticate(user=self.user)
        
        data = {
            'name': 'Test Person',
            'sos_type': 0,
            'initial_latitude': 28.7041,
            'initial_longitude': 77.1025
        }
        response = self.client.post('/api/create-sos/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the SOS is associated with the authenticated user
        sos_id = response.data['sos_id']
        sos = SOS.objects.get(id=sos_id)
        self.assertEqual(sos.user, self.user)
    
    def test_update_location(self):
        # First create an SOS
        sos = SOS.objects.create(
            name='Test Person',
            sos_type=0,
            initial_latitude=28.7041,
            initial_longitude=77.1025,
            room_id=str(uuid.uuid4())
        )
        
        data = {
            'sos_request': sos.id,
            'latitude': 28.7051,
            'longitude': 77.1030
        }
        response = self.client.post('/api/update-location/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the location update was created
        location_update = LocationUpdate.objects.filter(sos_request=sos).first()
        self.assertIsNotNone(location_update)
        self.assertEqual(location_update.latitude, 28.7051)
    
    def test_assign_officer(self):
        # Login as admin
        self.client.force_authenticate(user=self.admin)
        
        # First create an SOS
        sos = SOS.objects.create(
            name='Test Person',
            sos_type=0,
            initial_latitude=28.7041,
            initial_longitude=77.1025,
            room_id=str(uuid.uuid4())
        )
        
        data = {
            'sos_request': sos.id,
            'officer_name': 'Officer Smith',
            'unit_number': 'Unit-123'
        }
        response = self.client.post('/api/assign-officer/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the SOS has been updated
        sos.refresh_from_db()
        self.assertEqual(sos.unit_number_dispatched, 'Unit-123')
        self.assertEqual(sos.acknowledged_flag, 1)
    
    def test_resolve_sos(self):
        # Login as admin
        self.client.force_authenticate(user=self.admin)
        
        # First create an SOS
        sos = SOS.objects.create(
            name='Test Person',
            sos_type=0,
            initial_latitude=28.7041,
            initial_longitude=77.1025,
            room_id=str(uuid.uuid4())
        )
        
        response = self.client.post(f'/api/resolve-sos/{sos.id}/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the SOS has been resolved
        sos.refresh_from_db()
        self.assertEqual(sos.status_flag, 1)  # 1 = Resolved
    
    def test_list_sos_authenticated(self):
        # Login as admin
        self.client.force_authenticate(user=self.admin)
        
        # Create a few SOS requests
        SOS.objects.create(
            name='Person 1',
            sos_type=0,
            initial_latitude=28.7041,
            initial_longitude=77.1025,
            room_id=str(uuid.uuid4())
        )
        SOS.objects.create(
            name='Person 2',
            sos_type=1,
            initial_latitude=28.6139,
            initial_longitude=77.2090,
            room_id=str(uuid.uuid4())
        )
        
        response = self.client.get('/api/sos/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_list_sos_unauthenticated(self):
        # Ensure unauthenticated users can't list SOS requests
        response = self.client.get('/api/sos/', format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_unauthorized_access(self):
        # Create an SOS
        sos = SOS.objects.create(
            name='Test Person',
            sos_type=0,
            initial_latitude=28.7041,
            initial_longitude=77.1025,
            room_id=str(uuid.uuid4())
        )
        
        # Try to assign an officer without authentication
        data = {
            'sos_request': sos.id,
            'officer_name': 'Officer Smith',
            'unit_number': 'Unit-123'
        }
        response = self.client.post('/api/assign-officer/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Try to resolve an SOS without authentication
        response = self.client.post(f'/api/resolve-sos/{sos.id}/', format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
