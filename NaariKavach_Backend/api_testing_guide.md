# NaariKavach API Testing Guide

Complete guide for testing the NaariKavach backend REST API and Socket.IO integration.

## 🚀 Quick Setup

1. **Start both servers:**
   ```bash
   ./run_server.sh    # Django API on port 8000
   ./run_socketio.sh  # Socket.IO on port 8001
   ```

2. **Base URL:** `http://localhost:8000`
3. **Browsable API:** Visit endpoints in browser for interactive testing
4. **Socket.IO:** `ws://localhost:8001`

## 🔐 Authentication Endpoints (Djoser)

### 1. Register New User

**Endpoint:** `POST /auth/users/`  
**Auth Required:** No

**Request Body:**
```json
{
  "username": "testuser",
  "password": "securepassword123",
  "re_password": "securepassword123",
  "email": "test@example.com"
}
```

**Expected Response:**
```json
{
  "id": 2,
  "username": "testuser",
  "email": "test@example.com"
}
```

### 2. Login (Get Auth Token)

**Endpoint:** `POST /auth/token/login/`  
**Auth Required:** No

**Request Body:**
```json
{
  "username": "testuser",
  "password": "securepassword123"
}
```

**Expected Response:**
```json
{
  "auth_token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
}
```

### 3. Logout

**Endpoint:** `POST /auth/token/logout/`  
**Auth Required:** Yes  
**Headers:** `Authorization: Token your_auth_token_here`

**Response:** `204 No Content`

## 🆘 SOS Management Endpoints

### 1. Create SOS Alert (Anonymous)

**Endpoint:** `POST /api/create-sos/`  
**Auth Required:** No  
**Description:** Create emergency SOS alert (triggers Socket.IO event)

**Request Body:**
```json
{
  "name": "Jane Doe",
  "sos_type": 0,
  "initial_latitude": 12.9716,
  "initial_longitude": 77.5946
}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "SOS created successfully",
  "sos_id": 1,
  "room_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Socket.IO Event Triggered:** `sos_created` emitted to `sos_channel`

### 2. List All SOS Requests

**Endpoint:** `GET /api/sos/`  
**Auth Required:** Yes  
**Headers:** `Authorization: Token your_auth_token_here`

**Expected Response:**
```json
[
  {
    "id": 1,
    "name": "Jane Doe",
    "sos_type": 0,
    "status_flag": 0,
    "initial_latitude": 12.9716,
    "initial_longitude": 77.5946,
    "unit_number_dispatched": null,
    "acknowledged_flag": 0,
    "room_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-06-26T10:15:30.123456Z",
    "updated_at": "2025-06-26T10:15:30.123456Z",
    "user": null,
    "location_updates": [],
    "officer_assignments": []
  }
]
```

### 3. Update Location

**Endpoint:** `POST /api/update-location/`  
**Auth Required:** No  
**Description:** Update location for active SOS (triggers Socket.IO events)

**Request Body:**
```json
{
  "sos_request": 1,
  "latitude": 12.9726,
  "longitude": 77.5956
}
```

**Expected Response:**
```json
{
  "status": "Location updated successfully"
}
```

**Socket.IO Events Triggered:**
- `location_update_to_room` → SOS room
- `location_update_to_unit` → Assigned officer's unit room (if assigned)

### 4. Assign Officer

**Endpoint:** `POST /api/assign-officer/`  
**Auth Required:** Yes  
**Headers:** `Authorization: Token your_auth_token_here`

**Request Body:**
```json
{
  "sos_request": 1,
  "officer_name": "Officer Smith",
  "unit_number": "UNIT001"
}
```

**Expected Response:**
```json
{
  "status": "Officer assigned successfully",
  "officer": {
    "id": 1,
    "sos_request": 1,
    "officer_name": "Officer Smith",
    "unit_number": "UNIT001",
    "assigned_at": "2025-06-26T10:20:00.123456Z"
  }
}
```

### 5. Resolve SOS

**Endpoint:** `POST /api/resolve-sos/{sos_id}/`  
**Auth Required:** Yes  
**Headers:** `Authorization: Token your_auth_token_here`

**Example:** `POST /api/resolve-sos/1/`

**Expected Response:**
```json
{
  "status": "SOS marked as resolved successfully",
  "sos": {
    "id": 1,
    "name": "Jane Doe",
    "sos_type": 0,
    "status_flag": 1,
    "initial_latitude": 12.9716,
    "initial_longitude": 77.5946,
    "unit_number_dispatched": "UNIT001",
    "acknowledged_flag": 1,
    "room_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-06-26T10:15:30.123456Z",
    "updated_at": "2025-06-26T10:25:00.123456Z",
    "user": null
  }
}
```

### 6. Get All SOS Requests (Public)

**Endpoint:** `GET /api/get-all-sos/`  
**Auth Required:** No  
**Description:** Fetch all SOS entries from the database

**Expected Response:**
```json
{
  "status": "success",
  "message": "SOS entries fetched successfully",
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Jane Doe",
      "sos_type": 0,
      "status_flag": 1,
      "initial_latitude": 12.9716,
      "initial_longitude": 77.5946,
      "unit_number_dispatched": "UNIT001",
      "acknowledged_flag": 1,
      "room_id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-06-26T10:15:30.123456Z",
      "updated_at": "2025-06-26T10:25:00.123456Z",
      "user": null,
      "location_updates": [...],
      "officer_assignments": [...],
      "images": [...]
    }
  ]
}
```

## 📷 Image Management Endpoints

### 1. Upload Multiple Images for SOS

**Endpoint:** `POST /api/upload-sos-images/`  
**Auth Required:** No  
**Content-Type:** `multipart/form-data`  
**Description:** Upload multiple images associated with an SOS request

**Form Data:**
- `sos_id`: (required) The SOS ID to associate images with
- `images`: (required) Multiple image files (can select multiple files)
- `descriptions[]`: (optional) Array of descriptions for each image

**Example using curl:**
```bash
curl -X POST http://localhost:8000/api/upload-sos-images/ \
  -F "sos_id=1" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "descriptions=Evidence photo" \
  -F "descriptions=Location photo"
```

**Example using JavaScript FormData:**
```javascript
const formData = new FormData();
formData.append('sos_id', '1');
formData.append('images', imageFile1);
formData.append('images', imageFile2);
formData.append('descriptions', 'Evidence photo');
formData.append('descriptions', 'Location photo');

fetch('http://localhost:8000/api/upload-sos-images/', {
  method: 'POST',
  body: formData
})
```

**Expected Response (Success):**
```json
{
  "status": "success",
  "message": "Successfully uploaded 2 image(s)",
  "uploaded_images": [
    {
      "id": 1,
      "sos_request": 1,
      "image": "/media/sos_images/image1_abc123.jpg",
      "image_url": "http://localhost:8000/media/sos_images/image1_abc123.jpg",
      "description": "Evidence photo",
      "uploaded_at": "2025-06-27T10:30:00.123456Z"
    },
    {
      "id": 2,
      "sos_request": 1,
      "image": "/media/sos_images/image2_def456.jpg",
      "image_url": "http://localhost:8000/media/sos_images/image2_def456.jpg",
      "description": "Location photo",
      "uploaded_at": "2025-06-27T10:30:01.123456Z"
    }
  ]
}
```

**Expected Response (Error):**
```json
{
  "status": "error",
  "message": "SOS request not found"
}
```

### 2. Get All Images for SOS

**Endpoint:** `GET /api/get-sos-images/{sos_id}/`  
**Auth Required:** No  
**Description:** Retrieve all images associated with a specific SOS request

**Example:** `GET /api/get-sos-images/1/`

**Expected Response:**
```json
{
  "status": "success",
  "message": "Images fetched successfully",
  "sos_id": 1,
  "count": 2,
  "images": [
    {
      "id": 2,
      "sos_request": 1,
      "image": "/media/sos_images/image2_def456.jpg",
      "image_url": "http://localhost:8000/media/sos_images/image2_def456.jpg",
      "description": "Location photo",
      "uploaded_at": "2025-06-27T10:30:01.123456Z"
    },
    {
      "id": 1,
      "sos_request": 1,
      "image": "/media/sos_images/image1_abc123.jpg",
      "image_url": "http://localhost:8000/media/sos_images/image1_abc123.jpg",
      "description": "Evidence photo",
      "uploaded_at": "2025-06-27T10:30:00.123456Z"
    }
  ]
}
```

**Testing Notes for Images:**
- Images are ordered by upload time (newest first)
- Supported formats: JPG, JPEG, PNG, GIF
- Maximum file size depends on Django settings
- Images are stored in `/media/sos_images/` directory
- Each image gets a unique filename to prevent conflicts
- Use `image_url` field for displaying images in frontend applications
## 🔌 Socket.IO Testing

### Connection and Basic Setup
```javascript
// Connect to Socket.IO server
const socket = io('http://localhost:8001');

// Listen for connection confirmation
socket.on('connection_established', (data) => {
    console.log('✅ Connected:', data.message);
});

// Listen for errors
socket.on('error', (data) => {
    console.error('❌ Error:', data.message);
});
```

### Socket.IO Channels to Join

#### 1. SOS Channel (All New SOS Alerts)
```javascript
// Join SOS channel - receives all new SOS creation events
socket.emit('join_sos_channel', {});

// Listen for new SOS alerts
socket.on('new_sos', (data) => {
    console.log('🚨 New SOS:', data);
    // data: {sos_id, room_id, name, sos_type, latitude, longitude, created_at}
});

// Listen for room join confirmation
socket.on('room_joined', (data) => {
    console.log('✅ Joined:', data.channel);
});
```

#### 2. Specific SOS Room (Individual SOS Tracking)
```javascript
// Join specific SOS room using room_id from create-sos API response
socket.emit('join_sos_room', {
    room_id: '550e8400-e29b-41d4-a716-446655440000'  // Use actual room_id
});

// Listen for location updates for this SOS
socket.on('location_history', (data) => {
    console.log('📍 SOS Location Update:', data);
    // data: {sos_id, latitude, longitude, timestamp}
});
```

#### 3. Officer Unit Room (Officer Location Updates)
```javascript
// Officers join by their unit number
socket.emit('join_officer_room', {
    unit_number: 'UNIT001'  // Officer's unit number
});

// Listen for location updates for assigned SOS
socket.on('unit_location_update', (data) => {
    console.log('🚔 Unit Location Update:', data);
    // data: {sos_id, latitude, longitude, timestamp}
});
```

#### 4. Location Tracking Channel (All Location Updates)
```javascript
// Join global location tracking channel
socket.emit('join_location_tracking_channel', {});

// Listen for all location updates system-wide
socket.on('location_tracking_update', (data) => {
    console.log('🌍 Global Location Update:', data);
    // data: {unit_number, sos_id, latitude, longitude, timestamp}
});
```

### Complete Testing Workflow

```javascript
const socket = io('http://localhost:8001');

socket.on('connection_established', () => {
    console.log('✅ Connected to Socket.IO server');
    
    // 1. Join SOS channel to receive new alerts
    socket.emit('join_sos_channel', {});
    
    // 2. Join location tracking for global monitoring
    socket.emit('join_location_tracking_channel', {});
    
    // 3. Join as an officer (if testing officer functionality)
    socket.emit('join_officer_room', { unit_number: 'UNIT001' });
});

// Listen for all event types
socket.on('room_joined', (data) => console.log('🟢 Room joined:', data));
socket.on('new_sos', (data) => console.log('🚨 New SOS:', data));
socket.on('location_history', (data) => console.log('📍 Location update:', data));
socket.on('unit_location_update', (data) => console.log('🚔 Unit update:', data));
socket.on('location_tracking_update', (data) => console.log('🌍 Global update:', data));
socket.on('error', (data) => console.error('❌ Error:', data));
```

### Testing API + Socket.IO Integration

1. **Create SOS and monitor events:**
```bash
# 1. Create SOS via API
curl -X POST http://localhost:8000/api/create-sos/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Alert",
    "sos_type": 0,
    "initial_latitude": 12.9716,
    "initial_longitude": 77.5946
  }'

# 2. Should trigger 'new_sos' event in Socket.IO sos_channel
# 3. Note the room_id from response, then join that specific room:
```

```javascript
// Use room_id from API response
socket.emit('join_sos_room', { 
    room_id: 'actual-room-id-from-api-response' 
});
```

2. **Update location and monitor events:**
```bash
# Update location via API
curl -X POST http://localhost:8000/api/update-location/ \
  -H "Content-Type: application/json" \
  -d '{
    "sos_request": 1,
    "latitude": 12.9726,
    "longitude": 77.5956
  }'

# Should trigger multiple Socket.IO events:
# - location_history (in SOS room)
# - location_tracking_update (in global tracking)
# - unit_location_update (if officer assigned)
```

### ⚠️ Important Notes

- **Always pass objects:** Use `{}` even for simple joins: `socket.emit('join_sos_channel', {})`
- **Room IDs:** Use the exact `room_id` returned from `POST /api/create-sos/`
- **Unit Numbers:** Use consistent unit numbers like 'UNIT001', 'UNIT002', etc.
- **Error Handling:** Always listen for 'error' events for debugging

## 🧪 Quick Test Commands

### Complete API Flow Test
```bash
# 1. Create SOS
curl -X POST http://localhost:8000/api/create-sos/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Emergency",
    "sos_type": 0,
    "initial_latitude": 12.9716,
    "initial_longitude": 77.5946
  }'

# 2. Update location (use sos_id from step 1)
curl -X POST http://localhost:8000/api/update-location/ \
  -H "Content-Type: application/json" \
  -d '{
    "sos_request": 1,
    "latitude": 12.9726,
    "longitude": 77.5956
  }'

# 3. Upload images (use sos_id from step 1)
curl -X POST http://localhost:8000/api/upload-sos-images/ \
  -F "sos_id=1" \
  -F "images=@/path/to/test-image.jpg" \
  -F "descriptions=Test evidence photo"

# 4. Get images for SOS
curl -X GET http://localhost:8000/api/get-sos-images/1/

# 5. Get all SOS requests
curl -X GET http://localhost:8000/api/get-all-sos/
```

### Browser Console Test
```javascript
// Copy-paste this into browser console after loading Socket.IO library
const socket = io('http://localhost:8001');
socket.on('connection_established', () => console.log('Connected!'));
socket.emit('join_sos_channel', {});
socket.on('new_sos', data => console.log('New SOS:', data));
```
      "room_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "created_at": "2025-06-24T12:00:00Z",
      "updated_at": "2025-06-24T12:15:00Z",
      "location_updates": [
        {
          "id": 1,
          "sos_request": 1,
          "latitude": 28.7051,
          "longitude": 77.1030,
          "timestamp": "2025-06-24T12:05:00Z"
        }
      ],
      "officer_assignments": [
        {
          "id": 1,
          "sos_request": 1,
          "officer_name": "Officer Smith",
          "unit_number": "Unit-123",
          "assigned_at": "2025-06-24T12:10:00Z"
        }
      ]
    }
  ]
  ```

#### 6. Get a Single SOS Request (Authenticated Only)
- **URL**: `/api/sos/{id}/`
- **Method**: `GET`
- **Headers**:
  ```
  Authorization: JWT {access_token}
  ```
- **Successful Response**: HTTP 200 OK
  ```json
  {
    "id": 1,
    "user": null,
    "name": "John Doe",
    "sos_type": 0,
    "status_flag": 1,
    "initial_latitude": 28.7041,
    "initial_longitude": 77.1025,
    "unit_number_dispatched": "Unit-123",
    "acknowledged_flag": 1,
    "room_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "created_at": "2025-06-24T12:00:00Z",
    "updated_at": "2025-06-24T12:15:00Z",
    "location_updates": [...],
    "officer_assignments": [...]
  }
  ```

## WebSocket API

### SOS Room WebSocket
- **URL**: `ws://localhost:8000/ws/sos/{room_id}/`

#### Connection Response
```json
{
  "type": "connection_established",
  "message": "You are now connected to the SOS room!"
}
```

#### Sending Location Updates
```json
{
  "type": "location_update",
  "sos_id": 1,
  "latitude": 28.7055,
  "longitude": 77.1035
}
```

#### Receiving Location Updates
```json
{
  "type": "location_update",
  "sos_id": 1,
  "latitude": 28.7055,
  "longitude": 77.1035
}
```

#### Sending Officer Assignment
```json
{
  "type": "officer_assigned",
  "sos_id": 1,
  "unit_number": "Unit-123",
  "officer_name": "Officer Smith"
}
```

#### Receiving Officer Assignment
```json
{
  "type": "officer_assignment",
  "sos_id": 1,
  "unit_number": "Unit-123",
  "officer_name": "Officer Smith"
}
```

## Testing with Insomnia

### 1. Authentication Flow Test

1. **Register a New User**
   - Create a POST request to `/auth/users/`
   - Add JSON body with username, password, re_password, and email
   - Send the request
   - Verify you receive a 201 Created response

2. **Login**
   - Create a POST request to `/auth/jwt/create/`
   - Add JSON body with username and password
   - Send the request
   - Save the access token for subsequent requests

3. **View User Profile**
   - Create a GET request to `/auth/users/me/`
   - Add Authorization header with the access token
   - Send the request
   - Verify you can view user details

### 2. SOS Creation and Tracking Flow

1. **Create an SOS Alert**
   - Create a POST request to `/api/create-sos/`
   - Add JSON body with name, sos_type, initial_latitude, and initial_longitude
   - Send the request
   - Save the received sos_id and room_id

2. **Update Location**
   - Create a POST request to `/api/update-location/`
   - Add JSON body with sos_request (use saved sos_id), latitude, and longitude
   - Send the request
   - Verify successful response

3. **Connect to WebSocket**
   - Use Insomnia's WebSocket feature to connect to `ws://localhost:8000/ws/sos/{room_id}/`
   - Verify the connection is established

4. **Send Location Updates via WebSocket**
   - Send WebSocket message with type "location_update", sos_id, latitude, and longitude
   - Verify you receive the location update echo

5. **Assign Officer**
   - Create a POST request to `/api/assign-officer/`
   - Add Authorization header with the access token
   - Add JSON body with sos_request (use saved sos_id), officer_name, and unit_number
   - Send the request
   - Verify successful response

6. **Send Officer Assignment via WebSocket**
   - Send WebSocket message with type "officer_assigned", sos_id, and unit_number
   - Verify you receive the officer assignment echo

7. **Mark SOS as Resolved**
   - Create a POST request to `/api/resolve-sos/{sos_id}/`
   - Add Authorization header with the access token
   - Send the request
   - Verify successful response

8. **Upload Images to SOS**
   - Create a POST request to `/api/upload-sos-images/`
   - Set Content-Type to `multipart/form-data`
   - Add form fields:
     - `sos_id`: Use saved sos_id from step 1
     - `images`: Select multiple image files
     - `descriptions`: Add optional descriptions
   - Send the request
   - Verify successful upload response

9. **Get SOS Images**
   - Create a GET request to `/api/get-sos-images/{sos_id}/`
   - Use saved sos_id from step 1
   - Send the request
   - Verify you receive all uploaded images with URLs

### 3. Error Cases Testing

1. **Invalid SOS Creation**
   - Create a POST request to `/api/create-sos/` with missing required fields
   - Verify you receive a 400 Bad Request response

2. **Invalid Location Update**
   - Create a POST request to `/api/update-location/` with invalid or non-existent sos_id
   - Verify you receive appropriate error response

3. **Unauthorized Access**
   - Try to access endpoints requiring authentication without a token
   - Verify you receive a 401 Unauthorized response

4. **Invalid Image Upload**
   - Create a POST request to `/api/upload-sos-images/` with missing sos_id
   - Verify you receive a 400 Bad Request response
   - Try uploading with non-existent sos_id
   - Verify you receive a 404 Not Found response

5. **Invalid Image Retrieval**
   - Create a GET request to `/api/get-sos-images/{invalid_sos_id}/`
   - Verify you receive a 404 Not Found response

## Running the Server
To run the server for testing:

```bash
python manage.py runserver
```

## Notes
- The WebSocket connection will keep streaming location updates for a specific SOS.
- Only authenticated users can mark an SOS as resolved or assign officers.
- Anyone can create an SOS request and update locations, making it accessible in emergencies.
- **Image Upload Features:**
  - Multiple images can be uploaded for each SOS request
  - Images are stored securely in the `/media/sos_images/` directory
  - Each image can have an optional description
  - Image URLs are provided for direct access to uploaded files
  - Supported image formats: JPG, JPEG, PNG, GIF
  - Images are automatically organized and named to prevent conflicts
- **Database Changes:**
  - Added `SOSImage` model to store image metadata
  - Updated `SOS` serializer to include related images
  - Images are linked to SOS requests via foreign key relationship
