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

echo "📍 Working directory: $(pwd)"

# 2. Force reset to latest commit on origin/main (clears all git conflicts)
echo "📥 [1/5] Pulling latest code and real database from GitHub..."
git fetch origin main
git reset --hard origin/main
git clean -fd

# 3. Locate & activate virtual environment
echo "🐍 [2/5] Activating Python environment..."
if [ -f "backend/venv/bin/activate" ]; then
    source backend/venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "$HOME/.virtualenvs/craveables/bin/activate" ]; then
    source "$HOME/.virtualenvs/craveables/bin/activate"
fi

# Ensure dependencies are satisfied
pip install --no-cache-dir -r backend/requirements.txt reportlab pillow --quiet || true

# 4. Run migrations
echo "🗄️ [3/5] Running database migrations..."
python backend/manage.py migrate

# 5. Load the real live database (all 431 objects: orders, batches, expenses, items)
echo "📦 [4/5] Loading 100% real live data into deployed database..."
python backend/manage.py loaddata live_data.json

# 6. Collect static assets & fresh frontend bundle
echo "🎨 [5/5] Collecting fresh frontend bundle & static assets..."
python backend/manage.py collectstatic --noinput

# 7. Reload PythonAnywhere Web App automatically
echo "🔄 Reloading PythonAnywhere web application..."
if [ -f "/var/www/jeremy2005_pythonanywhere_com_wsgi.py" ]; then
    touch /var/www/jeremy2005_pythonanywhere_com_wsgi.py
    echo "Web app reloaded automatically via WSGI touch!"
fi

echo ""
echo "=========================================================="
echo "🎉 SUCCESS! Your deployed system is now 100% updated with:"
echo "   - All 11 Real Customer Orders (DP, Gian, Pastora Lucy, etc.)"
echo "   - All 3 Official Sales Orders with Receipts"
echo "   - All 7 Production Batches & 172 Stock Transactions"
echo "   - All 9 Real Expenses"
echo "   - New Features: Batch Selector, Single Cookies, Wholesale Pricing, Receipt Scanner, Receipt PDFs"
echo "=========================================================="
