#!/bin/bash
# ==============================================================================
# CRAVEABLES Business Management System - PythonAnywhere Deployment Script
# Run this script inside your PythonAnywhere Bash Console:
# bash deploy_pythonanywhere.sh
# ==============================================================================

set -e

echo "🧁 [1/5] Checking environment..."
cd "$(dirname "$0")"

if [ -d "backend" ]; then
    cd backend
fi

echo "📦 [2/5] Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3.11 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "🔑 [3/5] Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating template .env file..."
    cat << 'EOF' > .env
DJANGO_SECRET_KEY='craveables-secret-key-production-ready-2026'
DJANGO_DEBUG=False
ALLOWED_HOSTS=jeremy2005.pythonanywhere.com,localhost,127.0.0.1
# Replace with your actual Aiven PostgreSQL Service URI:
# DATABASE_URL=postgres://avnadmin:YOUR_PASSWORD@pg-65176da-itps415-villanueva.a.aivencloud.com:PORT/defaultdb?sslmode=require
EOF
    echo "⚠️ NOTE: Please edit .env with your Aiven PostgreSQL URI (nano .env) before running migrations."
fi

echo "🗄️ [4/5] Running database migrations & loading backup data..."
python manage.py migrate

if [ -f "craveables_backup.json" ]; then
    echo "Restoring database backup..."
    python manage.py loaddata craveables_backup.json || true
fi

echo "🎨 [5/5] Collecting static assets & frontend bundle..."
python manage.py collectstatic --noinput

echo "=============================================================================="
echo "✅ CRAVEABLES Deployment setup completed successfully!"
echo "Now go to your PythonAnywhere Web Tab, set the WSGI file, and click 'Reload'!"
echo "=============================================================================="
