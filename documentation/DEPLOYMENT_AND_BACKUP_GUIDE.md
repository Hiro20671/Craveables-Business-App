# CRAVEABLES Deployment, Backup & PWA Guide

## 1. Quick Local Execution

To start both servers in parallel:

```cmd
run_servers.bat
```

Or manually:

### Backend:
```bash
cd backend
venv\Scripts\activate
python manage.py runserver 127.0.0.1:8000
```

### Frontend:
```bash
cd frontend
npm run dev
```

Open your browser at: `http://127.0.0.1:5173/`

Default Credentials:
- **Admin**: `admin` / `admin123`
- **Staff**: `staff` / `staff123`

---

## 2. Production Deployment (Ubuntu Linux / Cloud Server)

### Architecture
- **Nginx**: Reverse proxy serving Vite static bundle & routing `/api` to Gunicorn
- **Gunicorn**: WSGI application server for Django
- **PostgreSQL 16**: Centralized ACID database
- **Systemd**: Process supervision for Gunicorn

### Gunicorn Configuration (`/etc/systemd/system/craveables.service`)
```ini
[Unit]
Description=Gunicorn instance for CRAVEABLES
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/craveables/backend
ExecStart=/var/www/craveables/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 config.wsgi:application

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration (`/etc/nginx/sites-available/craveables`)
```nginx
server {
    listen 80;
    server_name craveables.ph www.craveables.ph;

    root /var/www/craveables/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /media/ {
        alias /var/www/craveables/backend/media/;
    }

    location /static/ {
        alias /var/www/craveables/backend/staticfiles/;
    }
}
```

---

## 3. Database Backup & Recovery

### Automated Daily Backup Script (`backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/craveables"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
pg_dump -U postgres -d craveables_db -F c -b -v -f "$BACKUP_DIR/craveables_db_$TIMESTAMP.dump"

# Keep last 30 days
find $BACKUP_DIR -type f -name "*.dump" -mtime +30 -exec rm {} \;
```

### Recovery Procedure
To restore from a backup:
```bash
pg_restore -U postgres -d craveables_db --clean --verbose /var/backups/craveables/craveables_db_YYYYMMDD_HHMMSS.dump
```

### Instant Excel Backup
Administrators can also download a complete multi-sheet Excel backup anytime from **Settings &gt; Data Export & Backup** or via `/api/reports/export/excel/`.

---

## 4. Progressive Web App (PWA) Installation

The application includes `manifest.json` and `sw.js` (service worker):

- **Android Chrome**: Open `http://<your-domain>`, tap menu (three dots) &gt; **Install App** / **Add to Home screen**.
- **Apple iOS Safari**: Open `http://<your-domain>`, tap the **Share** button &gt; **Add to Home Screen**.
- **Windows / Mac Chrome**: Click the **Install CRAVEABLES** badge in the address bar.

