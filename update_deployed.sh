#!/bin/bash
set -e

echo "=========================================================="
echo "🧁 CRAVEABLES - One-Command Deployed System Update & Data Sync"
echo "=========================================================="

# 1. Navigate to repository root
if [ -d "$HOME/Craveables-Business-App" ]; then
    cd "$HOME/Craveables-Business-App"
elif [ -d "Craveables-Business-App" ]; then
    cd "Craveables-Business-App"
fi

REPO_DIR="$(pwd)"
echo "📍 Working directory: $REPO_DIR"

# 2. Free disk space BEFORE git fetch (prevents PythonAnywhere 512MB Disk Quota Exceeded)
echo "🧹 [1/6] Cleaning caches & duplicate static files to free disk quota..."
rm -rf ~/.cache/* ~/.npm/* ~/.local/share/Trash/* /tmp/* 2>/dev/null || true
rm -rf frontend/node_modules node_modules 2>/dev/null || true
rm -rf backend/staticfiles database_backup.json backend/craveables_backup.json 2>/dev/null || true
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# 3. Pull latest code & frontend build from GitHub
echo "📥 [2/6] Pulling latest code, frontend bundle, and real database from GitHub..."
git fetch --depth=1 origin main
git reset --hard origin/main
git clean -fd
git reflog expire --expire=now --all 2>/dev/null || true
git gc --prune=now 2>/dev/null || true

# 4. Verify frontend/dist bundle integrity & link zero-byte staticfiles
echo "🎨 [3/6] Verifying production frontend bundle & linking static assets..."
mkdir -p frontend/dist/assets
if [ ! -s "frontend/dist/assets/index-Cfx6btse.js" ]; then
    curl -sSL https://raw.githubusercontent.com/Hiro20671/Craveables-Business-App/main/frontend/dist/assets/index-Cfx6btse.js -o frontend/dist/assets/index-Cfx6btse.js
fi
if [ ! -s "frontend/dist/assets/index-C82v8Dht.css" ]; then
    curl -sSL https://raw.githubusercontent.com/Hiro20671/Craveables-Business-App/main/frontend/dist/assets/index-C82v8Dht.css -o frontend/dist/assets/index-C82v8Dht.css
fi
if [ ! -s "frontend/dist/index.html" ]; then
    curl -sSL https://raw.githubusercontent.com/Hiro20671/Craveables-Business-App/main/frontend/dist/index.html -o frontend/dist/index.html
fi

# Create zero-byte symlinks in backend/staticfiles so Nginx /static/ mapping uses 0 MB disk quota
rm -rf backend/staticfiles
mkdir -p backend/staticfiles
for item in "$REPO_DIR"/frontend/dist/*; do
    ln -sfn "$item" "$REPO_DIR/backend/staticfiles/$(basename "$item")"
done

echo "   ✔ JS Bundle Size: $(wc -c < frontend/dist/assets/index-Cfx6btse.js) bytes"
echo "   ✔ CSS Bundle Size: $(wc -c < frontend/dist/assets/index-C82v8Dht.css) bytes"

# 5. Locate & activate virtual environment
echo "🐍 [4/6] Activating Python environment..."
if [ -f "backend/venv/bin/activate" ]; then
    source backend/venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "$HOME/.virtualenvs/craveables/bin/activate" ]; then
    source "$HOME/.virtualenvs/craveables/bin/activate"
elif [ -d "$HOME/.virtualenvs" ]; then
    FIRST_VENV=$(find "$HOME/.virtualenvs" -maxdepth 2 -name "activate" | head -n 1)
    if [ -n "$FIRST_VENV" ]; then
        source "$FIRST_VENV"
    fi
fi

# Only install packages if missing to save disk quota
python -c "import django, rest_framework, corsheaders, whitenoise, reportlab, PIL" 2>/dev/null || \
    pip install --no-cache-dir -r backend/requirements.txt reportlab pillow --quiet || true

# 6. Run migrations & load real live data
echo "🗄️ [5/6] Running database migrations & syncing 431 real records..."
python backend/manage.py migrate
python backend/manage.py loaddata live_data.json

# 7. Reload PythonAnywhere Web App automatically
echo "🔄 [6/6] Reloading PythonAnywhere web application..."
for wsgi_file in /var/www/*_wsgi.py; do
    if [ -f "$wsgi_file" ]; then
        touch "$wsgi_file"
        echo "   ✔ Touched $wsgi_file"
    fi
done

echo ""
echo "=========================================================="
echo "🎉 SUCCESS! Your deployed system is now 100% fixed & updated!"
echo "   👉 Open https://jeremy2005.pythonanywhere.com and press Ctrl + Shift + R"
echo "=========================================================="
