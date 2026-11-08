from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, FileResponse
from pathlib import Path

import mimetypes
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, FileResponse, Http404

def serve_spa(request, resource=""):
    frontend_dist = (settings.BASE_DIR.parent / 'frontend' / 'dist').resolve()
    
    # If a specific static resource is requested (e.g. assets/..., poster-*.jpg, favicon.png)
    if resource:
        clean_resource = resource.lstrip('/')
        file_path = (frontend_dist / clean_resource).resolve()
        
        # Verify file is within frontend_dist directory (prevent directory traversal)
        try:
            if file_path.is_file() and str(file_path).startswith(str(frontend_dist)):
                content_type, encoding = mimetypes.guess_type(str(file_path))
                
                # Explicit fallback content types
                if file_path.suffix == '.js':
                    content_type = 'application/javascript'
                elif file_path.suffix == '.css':
                    content_type = 'text/css'
                elif file_path.suffix == '.json':
                    content_type = 'application/json'
                elif file_path.suffix in ['.jpg', '.jpeg']:
                    content_type = 'image/jpeg'
                elif file_path.suffix == '.png':
                    content_type = 'image/png'
                elif file_path.suffix == '.svg':
                    content_type = 'image/svg+xml'
                
                response = FileResponse(open(file_path, 'rb'), content_type=content_type or 'application/octet-stream')
                if encoding:
                    response['Content-Encoding'] = encoding
                
                # Never cache service worker or manifest
                if clean_resource in ['sw.js', 'service-worker.js', 'manifest.json']:
                    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
                    response['Pragma'] = 'no-cache'
                    response['Expires'] = '0'
                elif 'assets/' in clean_resource:
                    response['Cache-Control'] = 'public, max-age=31536000, immutable'
                return response
        except Exception:
            pass

    # Fallback to index.html for client-side routing (e.g. /, /login, /dashboard)
    index_file = frontend_dist / 'index.html'
    if index_file.exists():
        response = FileResponse(open(index_file, 'rb'), content_type='text/html')
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response
        
    return HttpResponse("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>CRAVEABLES API Server</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FFF9DF; color: #3B170B; margin: 0; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; }
                .card { background: #FFFDF5; border: 1px solid #E9D8B8; border-radius: 20px; padding: 32px; max-width: 520px; text-align: center; box-shadow: 0 4px 20px rgba(59,23,11,0.08); }
                h1 { margin-top: 0; font-size: 26px; }
                p { color: #5a4b41; font-size: 14px; line-height: 1.6; }
                a { display: inline-block; margin: 8px; padding: 10px 18px; border-radius: 12px; background: #3B170B; color: #fff; text-decoration: none; font-weight: bold; font-size: 13px; }
                a.secondary { background: #A97845; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>CRAVEABLES Business Management System</h1>
                <p>Django REST Framework Backend is running live & ready to serve requests.</p>
                <div style="margin-top: 20px;">
                    <a href="/admin/">Django Admin Portal</a>
                    <a href="/api/settings/" class="secondary">Settings API Endpoint</a>
                </div>
            </div>
        </body>
        </html>
    """)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/suppliers/', include('apps.suppliers.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/costing/', include('apps.costing.urls')),
    path('api/production/', include('apps.production.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/expenses/', include('apps.expenses.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/settings/', include('apps.settings_app.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Catch-all route to serve the React Single Page App and static dist files
urlpatterns += [
    re_path(r'^(?P<resource>(?!api/|admin/|media/|static/).*)$', serve_spa),
]
