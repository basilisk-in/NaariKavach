# 🚀 NaariKavach Backend - Quick Setup Guide

Complete setup guide for the NaariKavach emergency SOS backend system.

## 📋 Prerequisites

- **Python 3.8+**
- **pip** (Python package manager)

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Django API Server
```bash
# Terminal 1
./run_server.sh
# Server runs on http://localhost:8000
```

### 3. Start Socket.IO Server
```bash
# Terminal 2  
./run_socketio.sh
# Server runs on ws://localhost:8001
```

### 4. Test the System
Visit: **http://localhost:8000/api/** (Browsable API interface)

## 🧪 Testing

### Test REST API
```bash
# Create a test SOS
curl -X POST http://localhost:8000/api/create-sos/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "sos_type": 0,
    "initial_latitude": 12.9716,
    "initial_longitude": 77.5946
  }'
```

### Test Socket.IO (Browser Console)
```javascript
const socket = io('http://localhost:8001');
socket.on('connection_established', (data) => console.log('Connected:', data));
socket.emit('join_sos_channel', {});
socket.on('new_sos', (data) => console.log('New SOS:', data));
```

## 📚 Documentation

- **README.md** - Complete system overview
- **api_testing_guide.md** - REST API testing examples  
- **socketio_testing_guide.md** - Socket.IO testing guide

## 🎯 Key Features

✅ **Anonymous SOS Creation** - No auth required for emergencies  
✅ **Real-time Location Tracking** - Socket.IO integration  
✅ **Officer Unit Management** - Officers join by unit_number  
✅ **Dual Channel Updates** - SOS rooms + unit tracking  
✅ **Browsable API** - DRF interface for easy testing  
✅ **No Frontend Dependencies** - Pure backend system  

## 🔧 Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Django API    │    │   Socket.IO      │
│   Port: 8000    │◄──►│   Port: 8001     │
│                 │    │                  │
│ • REST API      │    │ • Real-time      │
│ • Auth (Djoser) │    │ • Room management│
│ • Database      │    │ • Event emission │
└─────────────────┘    └──────────────────┘
```

## 🚨 Emergency Workflow

1. **SOS Created** → `POST /api/create-sos/` → Socket.IO `new_sos` event
2. **Officer Joins** → Socket.IO `join_officer_room` with unit_number  
3. **Location Update** → `POST /api/update-location/` → Multiple Socket.IO events
4. **Real-time Tracking** → Location updates propagated to all relevant channels

Perfect for hackathons - get emergency response systems running in minutes! 🎯
