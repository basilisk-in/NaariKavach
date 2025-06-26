# NaariKavach Backend - Socket.IO + Django API

A clean Django REST API + Socket.IO backend for SOS emergency alerts with real-time location tracking.

## 🏗️ Architecture

### 1. Django REST API Server
- **Port:** 8000
- **Purpose:** Handle SOS creation, authentication, and data persistence
- **Features:**
  - User registration/login with token authentication (via Djoser)
  - SOS alert creation (anonymous allowed)
  - Location updates and officer assignments
  - SQLite database with Django ORM
  - DRF Browsable API interface

### 2. Socket.IO Server
- **Port:** 8001  
- **Purpose:** Real-time communication and live updates
- **Features:**
  - Simple socket.join() and emit() patterns only
  - In-memory data structures (no Redis)
  - Officers join by unit_number
  - Location updates to both SOS rooms and unit channels
  - General tracking channel for all unit movements

## 🚀 Quick Start

### Prerequisites
```bash
pip install -r requirements.txt
```

### Start Both Servers
```bash
# Terminal 1: Django API Server
./run_server.sh
# Runs on http://localhost:8000

# Terminal 2: Socket.IO Server  
./run_socketio.sh
# Runs on http://localhost:8001
```

### Initial Setup
```bash
# Create database tables
python manage.py migrate

# Collect static files for DRF browsable API
python manage.py collectstatic --noinput
```

## 📡 API Integration with Socket.IO

The Django API automatically emits events to Socket.IO:

- **POST `/api/create-sos/`** → Emits `sos_created` to `sos_channel`
- **POST `/api/update-location/`** → Emits to SOS room + assigned unit room
- **Officers join** → Can join `unit_{unit_number}` rooms
- **Location updates** → Propagated to general `location_tracking_channel`

## 🔌 Socket.IO Events

### Client Events (emit to server)
- `join_sos_room` - Join specific SOS room by room_id
- `join_officer_room` - Officers join by unit_number
- `join_sos_channel` - Receive all new SOS alerts
- `join_location_tracking_channel` - Track all unit locations

### Server Events (listen from server)
- `connection_established` - Connection confirmation
- `room_joined` - Room join confirmation
- `new_sos` - New SOS created (broadcasted to SOS channel)
- `location_history` - Location updates for specific SOS
- `unit_location_update` - Location updates for unit
- `location_tracking_update` - General location tracking updates
## 📊 REST API Endpoints

### Authentication (Djoser)
- `POST /auth/users/` - Register new user
- `POST /auth/token/login/` - Login and get token
- `POST /auth/token/logout/` - Logout

### SOS Operations
- `GET /api/sos/` - List all SOS requests (authenticated)
- `POST /api/create-sos/` - Create new SOS (anonymous allowed)
- `POST /api/update-location/` - Update location for SOS
- `POST /api/assign-officer/` - Assign officer to SOS (authenticated)
- `POST /api/resolve-sos/<id>/` - Mark SOS as resolved (authenticated)

### Data Flow Example
1. **Create SOS:** `POST /api/create-sos/` → Socket.IO emits to `sos_channel`
2. **Officer joins:** Socket.IO `join_officer_room` with `unit_number`
3. **Location update:** `POST /api/update-location/` → Emits to SOS room + unit room
4. **Tracking:** All unit movements propagated to `location_tracking_channel`

## 🧪 Testing

Refer to documentation:
- `api_testing_guide.md` - REST API endpoints and examples
- `socketio_testing_guide.md` - Socket.IO events and testing

## 💾 Database Models

- **SOS** - Emergency alerts with location, status, and room_id
- **LocationUpdate** - Real-time location tracking linked to SOS
- **OfficerAssignment** - Officer dispatch records with unit numbers

## 🛠️ Tech Stack

- **Django 5.2** - Web framework and ORM
- **Django REST Framework** - API endpoints with browsable interface
- **Djoser** - Authentication (registration, login, tokens)
- **python-socketio** - Real-time WebSocket communication
- **eventlet** - WSGI server for Socket.IO
- **SQLite** - Lightweight database

## 🎯 Key Features

✅ **No admin interface** - Pure API-driven backend  
✅ **No templates/frontend** - Backend-only architecture  
✅ **Simple Socket.IO** - Basic join/emit patterns only  
✅ **In-memory data** - No Redis dependency  
✅ **Unit-based officer rooms** - Officers join by unit_number  
✅ **Dual location propagation** - SOS rooms + unit tracking  
✅ **Anonymous SOS creation** - No auth required for emergencies  
✅ **Browsable API** - DRF interface for easy testing  

Perfect for hackathons - clean, simple, and fully functional! 🚀
