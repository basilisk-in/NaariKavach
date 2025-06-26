# Socket.IO Testing Guide

Guide for testing real-time Socket.IO events in the NaariKavach backend system.

## 🚀 Setup

1. **Start Socket.IO Server:**
   ```bash
   ./run_socketio.sh
   # Server runs on ws://localhost:8001
   ```

2. **Test Tools:**
   - **Browser Console** - For quick testing
   - **Socket.IO Client Library** - For app integration
   - **Postman** - Has Socket.IO support
   - **Online Socket.IO Tester** - Various online tools

## 🔌 Connection

### Basic Connection (JavaScript)
```javascript
// Connect to Socket.IO server
const socket = io('http://localhost:8001');

// Listen for connection confirmation
socket.on('connection_established', (data) => {
    console.log('Connected:', data.message);
});

// Handle errors
socket.on('error', (data) => {
    console.error('Error:', data.message);
});
```

## 📡 Client Events (Emit to Server)

### 1. Join SOS Room
```javascript
// Join a specific SOS room to receive location updates
socket.emit('join_sos_room', {
    room_id: '550e8400-e29b-41d4-a716-446655440000'
});

// Listen for confirmation
socket.on('room_joined', (data) => {
    console.log('Joined room:', data.room_id);
});

// Listen for location history
socket.on('location_history', (data) => {
    console.log('Location updates:', data.updates);
});
```

### 2. Officer Joins Unit Room
```javascript
// Officers join by their unit number
socket.emit('join_officer_room', {
    unit_number: 'UNIT001'
});

// Listen for confirmation
socket.on('room_joined', (data) => {
    console.log('Officer joined unit:', data.unit_number);
});

// Listen for unit location updates
socket.on('unit_location_update', (data) => {
    console.log('Unit location update:', data);
});
```

### 3. Join SOS Channel (New SOS Alerts)
```javascript
// Join to receive all new SOS creation notifications
socket.emit('join_sos_channel', {});

// Listen for confirmation
socket.on('room_joined', (data) => {
    console.log('Joined SOS channel:', data.channel);
});

// Listen for new SOS alerts
socket.on('new_sos', (data) => {
    console.log('New SOS created:', data);
    // data contains: sos_id, room_id, name, sos_type, latitude, longitude, created_at
});
```

### 4. Join Location Tracking Channel
```javascript
// Join to track all unit movements across the system
socket.emit('join_location_tracking_channel', {});

// Listen for confirmation
socket.on('room_joined', (data) => {
    console.log('Joined location tracking:', data.channel);
});

// Listen for all unit location updates
socket.on('location_tracking_update', (data) => {
    console.log('Unit movement:', data);
    // data contains: unit_number, sos_id, latitude, longitude, timestamp
## 📨 Server Events (Listen from Server)

### Standard Events
```javascript
// Connection confirmation
socket.on('connection_established', (data) => {
    console.log('Connected to server:', data.message);
});

// Room join confirmations
socket.on('room_joined', (data) => {
    console.log('Room joined:', data);
    // Contains room_id, unit_number, channel, or message
});

// Error handling
socket.on('error', (data) => {
    console.error('Socket.IO error:', data.message);
});
```

### SOS and Location Events
```javascript
// New SOS alerts (from sos_channel)
socket.on('new_sos', (data) => {
    console.log('🚨 New SOS Alert:', data);
    // Fields: sos_id, room_id, name, sos_type, latitude, longitude, created_at
});

// Location updates for specific SOS (from SOS rooms)
socket.on('location_history', (data) => {
    console.log('📍 SOS Location Update:', data);
    // Fields: sos_id, latitude, longitude, timestamp
});

// Location updates for officer units (from unit rooms)
socket.on('unit_location_update', (data) => {
    console.log('🚔 Unit Location Update:', data);
    // Fields: sos_id, latitude, longitude, timestamp
});

// General location tracking (from tracking channel)
socket.on('location_tracking_update', (data) => {
    console.log('🗺️ Location Tracking:', data);
    // Fields: unit_number, sos_id, latitude, longitude, timestamp
});
```

## 🧪 Testing Workflow

### Complete Testing Scenario
```javascript
const socket = io('http://localhost:8001');

// 1. Connect and set up listeners
socket.on('connection_established', () => {
    console.log('✅ Connected to Socket.IO server');
    
    // 2. Join SOS channel to receive new alerts
    socket.emit('join_sos_channel', {});
});

// 3. Listen for new SOS alerts
socket.on('new_sos', (sosData) => {
    console.log('🚨 New SOS:', sosData);
    
    // 4. Join the specific SOS room for location updates
    socket.emit('join_sos_room', {
        room_id: sosData.room_id
    });
});

// 5. Listen for location updates
socket.on('location_history', (locationData) => {
    console.log('📍 Location update:', locationData);
});

// 6. Officer joins their unit room
socket.emit('join_officer_room', {
    unit_number: 'UNIT001'
});

// 7. Listen for unit-specific location updates
socket.on('unit_location_update', (unitData) => {
    console.log('🚔 Unit location:', unitData);
});

// 8. Join location tracking for system-wide monitoring
socket.emit('join_location_tracking_channel', {});

socket.on('location_tracking_update', (trackingData) => {
    console.log('🗺️ System tracking:', trackingData);
});
```

## 🔄 API + Socket.IO Integration Testing

### 1. Create SOS via API → Receive Socket.IO Event
```bash
# Create SOS via REST API
curl -X POST http://localhost:8000/api/create-sos/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "sos_type": 0,
    "initial_latitude": 12.9716,
    "initial_longitude": 77.5946
  }'

# Should trigger 'new_sos' event in Socket.IO
```

### 2. Update Location via API → Receive Socket.IO Events
```bash
# Update location via REST API
curl -X POST http://localhost:8000/api/update-location/ \
  -H "Content-Type: application/json" \
  -d '{
    "sos_request": 1,
    "latitude": 12.9726,
    "longitude": 77.5956
  }'

# Should trigger:
# - 'location_history' in SOS room
# - 'unit_location_update' in assigned unit room (if assigned)
# - 'location_tracking_update' in tracking channel
```

## 🛠️ Testing Tools

### Browser Console Testing
```html
<!-- Add to HTML page -->
<script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
<script>
const socket = io('http://localhost:8001');
// Add event listeners from examples above
</script>
```

### Node.js Testing Script
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:8001');

// Add all event listeners and testing logic
socket.on('connect', () => {
    console.log('Connected to NaariKavach Socket.IO server');
    // Start testing...
});
```

## 🎯 Common Testing Scenarios

1. **Officer Monitoring:**
   - Officer joins unit room
   - Receives location updates for assigned SOS
   - Tracks unit movements system-wide

2. **Emergency Response:**
   - Monitor SOS channel for new alerts
   - Join specific SOS rooms for detailed tracking
   - Real-time location updates during emergency

3. **System Administration:**
   - Join location tracking channel
   - Monitor all unit movements
   - Track system-wide emergency activity

Perfect for testing real-time emergency response systems! 🚀

**Expected Response:**
```json
{
  "status": "success",
  "message": "SOS created successfully",
  "sos_id": 1,
  "room_id": "uuid-string-here"
}
```

#### 2. List All SOS Alerts (Authentication Required)

**Endpoint:** `GET /api/sos/`

**Headers:** 
- `Authorization: Token your_auth_token_here`

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
    "room_id": "uuid-string-here",
    "created_at": "2023-05-20T14:30:00Z",
    "updated_at": "2023-05-20T14:30:00Z"
  },
  ...
]
```

#### 3. Get SOS Details (Authentication Required)

**Endpoint:** `GET /api/sos/{sos_id}/`

**Headers:** 
- `Authorization: Token your_auth_token_here`

**Expected Response:**
```json
{
  "id": 1,
  "name": "Jane Doe",
  "sos_type": 0,
  "status_flag": 0,
  "initial_latitude": 12.9716,
  "initial_longitude": 77.5946,
  "unit_number_dispatched": null,
  "acknowledged_flag": 0,
  "room_id": "uuid-string-here",
  "created_at": "2023-05-20T14:30:00Z",
  "updated_at": "2023-05-20T14:30:00Z",
  "location_updates": [
    {
      "id": 1,
      "latitude": 12.9716,
      "longitude": 77.5946,
      "timestamp": "2023-05-20T14:30:00Z"
    },
    ...
  ],
  "officer_assignments": []
}
```

## Socket.IO Real-Time Communication

The Socket.IO server runs separately from the Django application and handles real-time updates for SOS alerts, location tracking, and officer assignments.

### Server Information

- **Socket.IO Server URL:** `http://localhost:8001`
- **Run Command:** `./run_socketio.sh`

### Client Connection

You can connect directly using any Socket.IO client:

```javascript
// Connect to Socket.IO server
const socket = io('http://localhost:8001');

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connection_established', (data) => {
  console.log('Connection established:', data.message);
});
```

### Events

#### Connect to an SOS Room

```javascript
// Join a specific SOS room to receive updates
socket.emit('join_sos_room', { room_id: 'your_room_id' });

// Listen for confirmation
socket.on('room_joined', (data) => {
  console.log(`Joined room ${data.room_id}: ${data.message}`);
});
```

#### Send Location Updates

```javascript
// Send location update for an SOS
socket.emit('location_update', {
  sos_id: 1,
  latitude: 12.9716,
  longitude: 77.5946
});

// Listen for acknowledgment
socket.on('update_received', (data) => {
  console.log('Server acknowledgment:', data.message);
});
```

#### Listen for Location Updates

```javascript
// Listen for location updates in subscribed rooms
socket.on('location_update', (data) => {
  console.log('Location update received:', data);
  // data = {
  //   type: 'location_update',
  //   sos_id: 1,
  //   latitude: 12.9716,
  //   longitude: 77.5946,
  //   timestamp: '2023-05-20T14:35:00Z'
  // }
});
```

#### Assign Officers to SOS

```javascript
// Assign an officer to an SOS
socket.emit('officer_assigned', {
  sos_id: 1,
  officer_name: 'Officer Smith',
  unit_number: 'P123'
});
```

#### Listen for Officer Assignments

```javascript
// Listen for officer assignments in subscribed rooms
socket.on('officer_assignment', (data) => {
  console.log('Officer assignment received:', data);
  // data = {
  //   type: 'officer_assignment',
  //   sos_id: 1,
  //   unit_number: 'P123',
  //   officer_name: 'Officer Smith',
  //   status: 'Acknowledged',
  //   acknowledged_flag: 1
  // }
});
```

#### Resolve an SOS

```javascript
// Mark an SOS as resolved
socket.emit('resolve_sos_request', {
  sos_id: 1
});
```

#### Listen for SOS Resolutions

```javascript
// Listen for SOS resolution events in subscribed rooms
socket.on('sos_resolved', (data) => {
  console.log('SOS resolved:', data);
  // data = {
  //   type: 'sos_resolved',
  //   sos_id: 1,
  //   status: 'Resolved',
  //   status_flag: 1
  // }
});
```

### Admin-Specific Functionality

#### Connect as Admin

```javascript
// Connect to Socket.IO server as admin
socket.emit('join_admin_room', { user_type: 'admin' });

// Listen for active SOS list
socket.on('active_sos_list', (data) => {
  console.log('Active SOS list received:', data.sos_requests);
});
```

#### Subscribe to Specific SOS Rooms

```javascript
// Subscribe to a specific SOS room as admin
socket.emit('admin_subscribe_room', { room_id: 'room_id_1' });

// Listen for confirmation
socket.on('subscription_confirmed', (data) => {
  console.log(`Subscribed to room ${data.room_id}: ${data.message}`);
});
```

#### Unsubscribe from SOS Rooms

```javascript
// Unsubscribe from a specific SOS room as admin
socket.emit('admin_unsubscribe_room', { room_id: 'room_id_1' });

// Listen for confirmation
socket.on('unsubscription_confirmed', (data) => {
  console.log(`Unsubscribed from room ${data.room_id}: ${data.message}`);
});
```

## Testing with Socket.IO Clients

You can test the Socket.IO server using various client libraries or tools:

### Browser Console Testing

You can test directly in a browser console by including the Socket.IO client library:

```html
<script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
<script>
  const socket = io('http://localhost:8001');
  
  socket.on('connect', () => {
    console.log('Connected to server');
    
    // Test joining admin room
    socket.emit('join_admin_room', { user_type: 'admin' });
  });
  
  socket.on('active_sos_list', (data) => {
    console.log('Active SOS requests:', data.sos_requests);
  });
</script>
```

### Node.js Client Testing

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:8001');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Test location update
  socket.emit('location_update', {
    sos_id: 1,
    latitude: 12.9716,
    longitude: 77.5946
  });
});
```

## Postman/Insomnia Testing

For Socket.IO testing in Postman or similar tools:

1. Connect to the Socket.IO server URL: `http://localhost:8001`
2. Set up listeners for events like `connection_established`, `location_update`, etc.
3. Emit events like `join_sos_room`, `location_update`, etc. with appropriate payload data

## Troubleshooting

If you encounter connection issues:

1. Ensure both Django server and Socket.IO server are running
2. Check for CORS issues in browser console
3. Verify correct ports and URLs are being used
4. Check the Socket.IO server logs for any errors

For any other issues, refer to the server logs or contact the development team.
