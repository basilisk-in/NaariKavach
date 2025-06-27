# 🚀 NaariKavach - How to Run the Project

Complete guide to set up and run the NaariKavach safety platform with all its components.

## 📋 Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 16+** (for website and mobile app)
- **npm** or **yarn** (package manager)
- **Git** (version control)
- **Expo CLI** (for mobile app)

## 🏗️ Project Structure

```
NaariKavach/
├── NaariKavach_Backend/     # Django API + Socket.IO server
├── naarikavach_website/     # React web dashboard
└── NaariKavach_App/         # React Native mobile app
```

## 🖥️ Backend Setup (Django + Socket.IO)

### 1. Navigate to Backend Directory
```bash
cd NaariKavach_Backend
```

### 2. Install Python Dependencies
```bash
# Using pip
pip install -r requirements.txt

# Or install manually
pip install Django>=5.2.3 djangorestframework>=3.16.0 djoser>=2.3.0 python-socketio>=5.10.0 eventlet>=0.33.3 django-cors-headers>=4.7.0 Pillow>=10.0.0

# Or using conda
conda env create -f environment.yml
conda activate naarikavach
```

### 3. Database Setup
```bash
# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

### 4. Start Backend Servers

**Option A: Using Shell Scripts (Recommended)**
```bash
# Terminal 1: Django API Server (Port 8000)
./run_server.sh

# Terminal 2: Socket.IO Server (Port 8001)
./run_socketio.sh
```

**Option B: Manual Commands**
```bash
# Terminal 1: Django API Server
python manage.py runserver 8000

# Terminal 2: Socket.IO Server
python sos_socketio_server.py
```

### 5. Verify Backend
- **API:** http://localhost:8000/api/
- **Admin:** http://localhost:8000/admin/
- **Socket.IO:** ws://localhost:8001

## 🌐 Website Setup (React Dashboard)

### 1. Navigate to Website Directory
```bash
cd naarikavach_website
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Start Development Server
```bash
npm run dev
# or
yarn dev
```

### 4. Access Website
- **URL:** http://localhost:5173
- **Login:** Use credentials from backend admin

## 📱 Mobile App Setup (React Native)

### 1. Navigate to App Directory
```bash
cd NaariKavach_App/NaariKavach
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Install Expo CLI (if not installed)
```bash
npm install -g @expo/cli
```

### 4. Start Expo Development Server
```bash
npx expo start
# or
yarn expo start
```

### 5. Run on Device/Emulator
- **Android:** Press `a` in terminal or scan QR code with Expo Go app
- **iOS:** Press `i` in terminal or scan QR code with Expo Go app
- **Web:** Press `w` in terminal

## 🧪 Testing the Complete System

### 1. Test Backend APIs
```bash
# Create test SOS
curl -X POST http://localhost:8000/api/create-sos/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Emergency",
    "sos_type": 0,
    "initial_latitude": 12.9716,
    "initial_longitude": 77.5946
  }'

# Upload test images
curl -X POST http://localhost:8000/api/upload-sos-images/ \
  -F "sos_id=1" \
  -F "images=@test-image.jpg" \
  -F "descriptions=Test evidence"

# Get all SOS requests
curl -X GET http://localhost:8000/api/get-all-sos/
```

### 2. Test Socket.IO Connection
```javascript
// Browser console test
const socket = io('http://localhost:8001');
socket.on('connection_established', () => console.log('Connected!'));
socket.emit('join_sos_channel', {});
socket.on('new_sos', data => console.log('New SOS:', data));
```

## 🚀 Quick Start (All Components)

### Terminal Setup
```bash
# Terminal 1: Backend API
cd NaariKavach_Backend && ./run_server.sh

# Terminal 2: Socket.IO Server
cd NaariKavach_Backend && ./run_socketio.sh

# Terminal 3: Website
cd naarikavach_website && npm run dev

# Terminal 4: Mobile App
cd NaariKavach_App/NaariKavach && npx expo start
```

### Access Points
- **Backend API:** http://localhost:8000/api/
- **Website Dashboard:** http://localhost:5173
- **Mobile App:** Expo Go app (scan QR code)
- **Socket.IO:** ws://localhost:8001
- **Admin Panel:** http://localhost:8000/admin/

## 🔧 Configuration

### Environment Variables (Backend)
Create `.env` file in `NaariKavach_Backend`:
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
```

### API Configuration (Frontend)
Update API base URLs in:
- **Website:** `src/config/api.js`
- **Mobile:** `services/api.js`

```javascript
const API_BASE_URL = 'http://localhost:8000';
const SOCKET_URL = 'http://localhost:8001';
```

## 🛠️ Development Workflow

### 1. Start All Services
```bash
# Use the quick start commands above
```

### 2. Make Changes
- **Backend:** Edit Python files, server auto-reloads
- **Website:** Edit React files, hot reload enabled
- **Mobile:** Edit React Native files, Expo fast refresh

### 3. Test Integration
- Create SOS via mobile app
- View alerts on web dashboard
- Check real-time updates via Socket.IO
- Upload images via API or mobile app

## 📱 Mobile App Development

### Run on Physical Device
```bash
# Install Expo Go app from app store
# Scan QR code from terminal
npx expo start
```

### Build for Production
```bash
# Android APK
npx expo build:android

# iOS IPA
npx expo build:ios
```

## 🌐 Website Deployment

### Build for Production
```bash
cd naarikavach_website
npm run build
```

### Serve Built Files
```bash
npm run preview
# or use any static file server
```

## 🔒 Production Deployment

### Backend (Django)
```bash
# Install production dependencies
pip install gunicorn

# Collect static files
python manage.py collectstatic

# Run with Gunicorn
gunicorn backend.wsgi:application --bind 0.0.0.0:8000
```

### Frontend (React)
```bash
# Build and deploy to hosting service
npm run build
# Upload dist/ folder to hosting service
```

## 🚨 Troubleshooting

### Common Issues

**Backend not starting:**
```bash
# Check Python version
python --version

# Install missing dependencies
pip install -r requirements.txt

# Check if port is in use
netstat -an | grep 8000
```

**Socket.IO connection failed:**
```bash
# Check if port 8001 is available
netstat -an | grep 8001

# Restart Socket.IO server
python sos_socketio_server.py
```

**Mobile app not loading:**
```bash
# Clear Expo cache
npx expo start --clear

# Check network connectivity
# Ensure device and computer on same network
```

**Image upload issues:**
```bash
# Check media directory permissions
ls -la media/

# Ensure Pillow is installed
pip install Pillow>=10.0.0
```

**CORS errors:**
- Check `CORS_ALLOWED_ORIGINS` in Django settings
- Ensure frontend URLs are whitelisted

### Performance Tips

1. **Backend:** Use Redis for Socket.IO scaling
2. **Website:** Enable React production build
3. **Mobile:** Use Expo production build
4. **Database:** Switch to PostgreSQL for production
5. **Images:** Configure proper media serving for production

## 📚 Additional Resources

- **API Documentation:** `api_testing_guide.md`
- **Socket.IO Guide:** `socketio_testing_guide.md`
- **Login Debug Guide:** `../NaariKavach_App/NaariKavach/LOGIN_DEBUG_GUIDE.md`
- **Setup Guide:** `SETUP.md`
- **API Debugging:** `../NaariKavach_App/NaariKavach/API_DEBUGGING_GUIDE.md`

## 🎯 Available Endpoints

### Core API Endpoints
- `POST /api/create-sos/` - Create emergency SOS
- `POST /api/update-location/` - Update location
- `POST /api/assign-officer/` - Assign officer
- `POST /api/resolve-sos/{id}/` - Mark SOS resolved
- `GET /api/get-all-sos/` - Get all SOS requests

### Image Management
- `POST /api/upload-sos-images/` - Upload multiple images
- `GET /api/get-sos-images/{sos_id}/` - Get SOS images

### Authentication (Djoser)
- `POST /auth/users/` - Register user
- `POST /auth/token/login/` - Login
- `POST /auth/token/logout/` - Logout

## 🎯 Next Steps

1. **Setup complete backend** ✅
2. **Configure web dashboard** ✅
3. **Test mobile app** ✅
4. **Integrate all components** ✅
5. **Test image upload functionality** ✅
6. **Deploy to production** 🚀

---

**Happy Coding! 🚀** The NaariKavach safety platform is now ready for development and testing.

For detailed API testing examples, refer to `api_testing_guide.md` in this directory.
