#!/bin/bash
# ==============================================================================
# CRAVEABLES - Safe Code & UI Update for PythonAnywhere
#
# Run it from OUTSIDE the repo so git can't rewrite the script while it runs:
#   cd ~/Craveables-Business-App && git fetch origin main \
#     && git show origin/main:update_deployed.sh > ~/update_deployed.sh \
#     && bash ~/update_deployed.sh
#
# Data safety rules:
#   1. The live database is copied to ~/craveables_db_backups/ (permanent, not /tmp)
#      BEFORE any git command runs.
#   2. backend/media and backend/db.sqlite3 are excluded from `git clean`.
#   3. The live database is ALWAYS copied back after the git reset, even if a
#      later step fails (EXIT trap).
# Everything is wrapped in main() so bash reads the whole script before running it.
# ==============================================================================

main() {
    echo "=========================================================="
    echo "🧁 CRAVEABLES - Safe Code & UI Update (Preserves Live Data)"
    echo "=========================================================="

    if [ -d "$HOME/Craveables-Business-App" ]; then
        cd "$HOME/Craveables-Business-App" || exit 1
    elif [ -d "Craveables-Business-App" ]; then
        cd "Craveables-Business-App" || exit 1
    fi
    REPO_DIR="$(pwd)"
    echo "📍 Working directory: $REPO_DIR"

    # ---------------------------------------------------------------- 1. Backup
    echo "🛡️ [1/6] Backing up the live database..."
    BACKUP_DIR="$HOME/craveables_db_backups"
    mkdir -p "$BACKUP_DIR"
    LIVE_DB="$REPO_DIR/backend/db.sqlite3"
    BACKUP_DB=""
    if [ -s "$LIVE_DB" ]; then
        BACKUP_DB="$BACKUP_DIR/craveables_db_$(date +%Y%m%d_%H%M%S).sqlite3"
        if ! cp -f "$LIVE_DB" "$BACKUP_DB" || ! cmp -s "$LIVE_DB" "$BACKUP_DB"; then
            echo "❌ Could not back up the live database (disk quota?). Stopping - nothing was changed."
            exit 1
        fi
        echo "   ✔ Backup saved: $BACKUP_DB"
    else
        echo "   ⚠ No live database found at $LIVE_DB"
    fi

    # Always put the live database back when the script exits, even on errors.
    restore_db() {
        if [ -n "$BACKUP_DB" ] && [ -s "$BACKUP_DB" ]; then
            if ! cmp -s "$BACKUP_DB" "$LIVE_DB" 2>/dev/null; then
                cp -f "$BACKUP_DB" "$LIVE_DB" && echo "   ✔ Live database restored from $BACKUP_DB"
            fi
        fi
    }
    trap restore_db EXIT

    # Free disk space (never touches the database or media)
    rm -rf ~/.cache/* ~/.npm/* ~/.local/share/Trash/* 2>/dev/null || true
    rm -rf frontend/node_modules node_modules backend/staticfiles 2>/dev/null || true
    find . -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true

    # ------------------------------------------------------------ 2. Pull code
    echo "📥 [2/6] Pulling latest code and frontend bundle from GitHub..."
    if ! git fetch --depth=1 origin main; then
        echo "❌ git fetch failed. Your data is untouched."
        exit 1
    fi
    git reset --hard origin/main || { echo "❌ git reset failed."; exit 1; }
    git clean -fd -e backend/media -e backend/db.sqlite3 -e 'backend/db.sqlite3-*' -e '.nfs*' 2>/dev/null || true

    # Put the live database back immediately after the reset.
    restore_db
    if [ -n "$BACKUP_DB" ] && ! cmp -s "$BACKUP_DB" "$LIVE_DB"; then
        echo "❌ Live database could not be restored automatically."
        echo "   Restore it manually with: cp '$BACKUP_DB' '$LIVE_DB'"
        exit 1
    fi
    echo "   ✔ Live database is in place"

    # ----------------------------------------------------- 3. Static assets
    echo "🎨 [3/6] Linking frontend bundle..."
    mkdir -p backend/staticfiles
    for item in "$REPO_DIR"/frontend/dist/*; do
        ln -sfn "$item" "$REPO_DIR/backend/staticfiles/$(basename "$item")"
    done
    LATEST_JS=$(ls frontend/dist/assets/index-*.js 2>/dev/null | head -n 1)
    [ -n "$LATEST_JS" ] && echo "   ✔ JS Bundle: $LATEST_JS"

    # ----------------------------------------------------------- 4. Python env
    echo "🐍 [4/6] Activating Python environment..."
    if [ -f "backend/venv/bin/activate" ]; then
        source backend/venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    elif [ -f "$HOME/.virtualenvs/craveables/bin/activate" ]; then
        source "$HOME/.virtualenvs/craveables/bin/activate"
    elif [ -d "$HOME/.virtualenvs" ]; then
        FIRST_VENV=$(find "$HOME/.virtualenvs" -maxdepth 2 -name "activate" | head -n 1)
        [ -n "$FIRST_VENV" ] && source "$FIRST_VENV"
    fi
    python -c "import django, rest_framework, corsheaders, whitenoise, reportlab, PIL" 2>/dev/null || \
        pip install --no-cache-dir -r backend/requirements.txt reportlab pillow --quiet || true

    # ------------------------------------------------------------ 5. Migrate
    echo "🗄️ [5/6] Applying schema migrations (adds new columns only, keeps all records)..."
    if ! python backend/manage.py migrate; then
        echo "❌ Migration failed. Your data backup is at: $BACKUP_DB"
        exit 1
    fi

    python - <<'PYEOF' 2>/dev/null || true
import sqlite3
c = sqlite3.connect("backend/db.sqlite3")
orders = c.execute("SELECT count(*) FROM sales_customerinquiry").fetchone()[0]
sales = c.execute("SELECT coalesce(sum(total_sales),0) FROM sales_saleorder").fetchone()[0]
print(f"   ✔ Live data check: {orders} orders, P{sales} total sales")
PYEOF

    # ------------------------------------------------------------- 6. Reload
    echo "🔄 [6/6] Reloading PythonAnywhere web application..."
    for wsgi_file in /var/www/*_wsgi.py; do
        [ -f "$wsgi_file" ] && touch "$wsgi_file" && echo "   ✔ Touched $wsgi_file"
    done

    # Keep only the 15 newest backups to stay inside the disk quota
    ls -1t "$BACKUP_DIR"/craveables_db_*.sqlite3 2>/dev/null | tail -n +16 | xargs -r rm -f

    echo ""
    echo "=========================================================="
    echo "🎉 Done. Open https://jeremy2005.pythonanywhere.com and press Ctrl + Shift + R"
    echo "=========================================================="
}

main "$@"
exit $?
