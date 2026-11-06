#!/bin/bash
# ==============================================================================
# CRAVEABLES Business Management System - PythonAnywhere Deployment Script
# Usage:
#   bash deploy_pythonanywhere.sh
# Or:
#   bash deploy_pythonanywhere.sh "<AIVEN_SERVICE_URI>"
# ==============================================================================

set -e

echo "🧁 [1/5] Checking environment..."
cd "$(dirname "$0")"

if [ -d "backend" ]; then
    cd backend
fi

echo "📦 [2/5] Creating Python virtual environment & installing dependencies..."
if [ ! -d "venv" ]; then
    python3.11 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "🔑 [3/5] Setting up environment variables (.env)..."
if [ ! -f ".env" ]; then
    AIVEN_URI="$1"
    if [ -z "$AIVEN_URI" ]; then
        echo ""
        echo "Please paste your Aiven PostgreSQL URI (press Enter):"
        read -r AIVEN_URI
    fi

    cat << EOF > .env
DJANGO_SECRET_KEY='craveables-secret-key-production-ready-2026'
DJANGO_DEBUG=False
ALLOWED_HOSTS=jeremy2005.pythonanywhere.com,localhost,127.0.0.1,*
DATABASE_URL=${AIVEN_URI}
EOF
    echo "Created .env successfully!"
fi

echo "🗄️ [4/5] Syncing database with Aiven PostgreSQL..."
python manage.py migrate

echo "🎨 [5/5] Collecting static assets & frontend bundle..."
python manage.py collectstatic --noinput

echo "=============================================================================="
echo "✅ CRAVEABLES Deployment setup completed successfully!"
echo "Now go to your PythonAnywhere Web Tab, configure the WSGI file, and click 'Reload'!"
echo "=============================================================================="
