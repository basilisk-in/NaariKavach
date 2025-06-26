#!/bin/bash

# Run this script to start the NaariKavach Backend Django server

echo "🚀 Starting NaariKavach Backend Django server..."

# Create database tables
echo "📊 Running database migrations..."
python manage.py migrate

# Collect static files for DRF browsable API
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Setup complete!"
echo ""
echo "🌐 Starting Django REST API server..."

# Run the Django server
python manage.py runserver 0.0.0.0:8000
