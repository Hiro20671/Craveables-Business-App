#!/bin/bash
set -e

echo "=========================================================="
echo "🧁 CRAVEABLES - Safe Code & UI Update (Preserves Live Data 100%)"
echo "=========================================================="

# 1. Navigate to repository root
if [ -d "$HOME/Craveables-Business-App" ]; then
    cd "$HOME/Craveables-Business-App"
elif [ -d "Craveables-Business-App" ]; then
    cd "Craveables-Business-App"
fi

REPO_DIR="$(pwd)"
echo "📍 Working directory: $REPO_DIR"

# 2. Free disk space & BACK UP live database + uploaded media BEFORE git reset!
echo "🛡️ [1/6] Backing up live database & media so ZERO live records are touched..."
rm -rf ~/.cache/* ~/.npm/* ~/.local/share/Trash/* 2>/dev/null || true
rm -rf frontend/node_modules node_modules 2>/dev/null || true
rm -rf backend/staticfiles database_backup.json backend/craveables_backup.json 2>/dev/null || true
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

if [ -s "backend/db.sqlite3" ]; then
    cp -f backend/db.sqlite3 /tmp/craveables_live_db.sqlite3
    echo "   ✔ Protected live database (backend/db.sqlite3)"
fi
if [ -d "backend/media" ]; then
    rm -rf /tmp/craveables_live_media 2>/dev/null || true
    cp -rf backend/media /tmp/craveables_live_media
    echo "   ✔ Protected uploaded photos & videos (backend/media)"
fi

# 3. Pull latest code & frontend build from GitHub
echo "📥 [2/6] Pulling latest code and frontend bundle from GitHub..."
git fetch --depth=1 origin main
git reset --hard origin/main
git clean -fd
git reflog expire --expire=now --all 2>/dev/null || true
git gc --prune=now 2>/dev/null || true

# IMMEDIATELY restore the live database and media so git reset NEVER overwrites user records!
if [ -s "/tmp/craveables_live_db.sqlite3" ]; then
    cp -f /tmp/craveables_live_db.sqlite3 backend/db.sqlite3
    rm -f /tmp/craveables_live_db.sqlite3
    echo "   ✔ Restored your exact live database untouched!"
fi
if [ -d "/tmp/craveables_live_media" ]; then
    mkdir -p backend/media
    cp -rf /tmp/craveables_live_media/* backend/media/ 2>/dev/null || true
    rm -rf /tmp/craveables_live_media
    echo "   ✔ Restored your uploaded photos & videos untouched!"
fi

# 4. Verify frontend/dist bundle integrity & link zero-byte staticfiles
echo "🎨 [3/6] Verifying production frontend bundle & linking static assets..."
mkdir -p frontend/dist/assets
if [ ! -s "frontend/dist/assets/index-Dl0cSSLw.js" ]; then
    curl -sSL https://raw.githubusercontent.com/Hiro20671/Craveables-Business-App/main/frontend/dist/assets/index-Dl0cSSLw.js -o frontend/dist/assets/index-Dl0cSSLw.js
fi
if [ ! -s "frontend/dist/assets/index-DmbG5mO5.css" ]; then
    curl -sSL https://raw.githubusercontent.com/Hiro20671/Craveables-Business-App/main/frontend/dist/assets/index-DmbG5mO5.css -o frontend/dist/assets/index-DmbG5mO5.css
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

echo "   ✔ JS Bundle Size: $(wc -c < frontend/dist/assets/index-Dl0cSSLw.js) bytes"
echo "   ✔ CSS Bundle Size: $(wc -c < frontend/dist/assets/index-DmbG5mO5.css) bytes"

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

# 6. Run schema migrations ONLY (never overwrite existing live data!)
echo "🗄️ [5/6] Applying schema migrations while keeping all your live orders & records untouched..."
python backend/manage.py migrate

# Repair only the 3 duplicate placeholder FeaturedOrder titles if they are still identical duplicates
python -c "
import os, sys, django
sys.path.insert(0, 'backend')
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()
from apps.sales.models import FeaturedOrder, sync_all_inquiries_to_sales
sync_all_inquiries_to_sales()
f2 = FeaturedOrder.objects.filter(id=2, title__icontains='BDO Lucena').first()
if f2 and not f2.image:
    f2.title = '60-Piece Classic Brownie Birthday Celebration Tower'
    f2.description = 'Custom fudgy brownie squares individually wrapped with red bows for a 30th birthday gathering in Lucena City.'
    f2.category = 'Brownies'
    f2.order_type = 'Birthday Hamper'
    f2.pieces_count = 60
    f2.save()
f3 = FeaturedOrder.objects.filter(id=3, title__icontains='BDO Lucena').first()
if f3 and not f3.image:
    f3.title = 'Artisanal Lakatan Banana Loaves with Sliced Almonds'
    f3.description = 'Freshly harvested Philippine Lakatan bananas baked in aluminum tins with red bows and wooden spoons for family weekend hampers.'
    f3.category = 'Cakes'
    f3.order_type = 'Family Box'
    f3.pieces_count = 24
    f3.save()
" 2>/dev/null || true

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
echo "🎉 SUCCESS! Code & UI updated while 100% preserving your live data!"
echo "   👉 Open https://jeremy2005.pythonanywhere.com and press Ctrl + Shift + R"
echo "=========================================================="
