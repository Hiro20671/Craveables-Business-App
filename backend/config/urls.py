import mimetypes
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, FileResponse, Http404
from django.views.static import serve as static_serve


def serve_spa(request, resource=""):
    frontend_dist = (settings.BASE_DIR.parent / 'frontend' / 'dist').resolve()
    static_root = Path(settings.STATIC_ROOT).resolve() if settings.STATIC_ROOT else frontend_dist

    # If a specific static resource is requested (e.g. assets/..., poster-*.jpg, favicon.png)
    if resource:
        clean_resource = resource.lstrip('/')
        file_path = (frontend_dist / clean_resource).resolve()
        if (not file_path.is_file() or file_path.stat().st_size == 0) and (static_root / clean_resource).is_file():
            candidate = (static_root / clean_resource).resolve()
            if candidate.stat().st_size > 0:
                file_path = candidate

        # If a browser requests an older or mismatched hashed bundle (e.g. assets/index-XYZ.js),
        # automatically resolve to the current bundle in frontend/dist/assets/ so the SPA never white-screens.
        if not file_path.is_file() or file_path.stat().st_size == 0:
            assets_dir = frontend_dist / 'assets'
            if clean_resource.startswith('assets/index-') and clean_resource.endswith('.js') and assets_dir.is_dir():
                js_files = sorted(assets_dir.glob('index-*.js'), key=lambda p: p.stat().st_mtime, reverse=True)
                for candidate in js_files:
                    if candidate.stat().st_size > 0:
                        file_path = candidate
                        break
            elif clean_resource.startswith('assets/index-') and clean_resource.endswith('.css') and assets_dir.is_dir():
                css_files = sorted(assets_dir.glob('index-*.css'), key=lambda p: p.stat().st_mtime, reverse=True)
                for candidate in css_files:
                    if candidate.stat().st_size > 0:
                        file_path = candidate
                        break

        try:
            if file_path.is_file() and file_path.stat().st_size > 0:
                content_type, encoding = mimetypes.guess_type(str(file_path))

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

                if clean_resource in ['sw.js', 'service-worker.js', 'manifest.json']:
                    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
                    response['Pragma'] = 'no-cache'
                    response['Expires'] = '0'
                elif 'assets/' in clean_resource:
                    response['Cache-Control'] = 'public, max-age=31536000, immutable'
                return response
        except Exception:
            pass

        # Never return text/html for missing static assets (.js, .css, images)
        if Path(clean_resource).suffix.lower() in ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.json', '.woff', '.woff2', '.map']:
            raise Http404(f"Static resource not found: {clean_resource}")

    # Fallback to index.html for client-side routing (e.g. /, /login, /dashboard)
    index_file = frontend_dist / 'index.html'
    if index_file.is_file() and index_file.stat().st_size > 0:
        try:
            content = index_file.read_text(encoding='utf-8')
            if '<div id="root"></div>' in content:
                response = HttpResponse(content, content_type='text/html')
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
                return response
        except Exception:
            pass

    latest_html = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#3B170B" />
    <meta name="description" content="CRAVEABLES Business Management System - Costing, Inventory, Production & Sales" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/manifest.json" />
    <title>CRAVEABLES | Business Management System</title>
    <script type="module" crossorigin src="/assets/index-DCWHiOGG.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-DX2HynaH.css">
  </head>
  <body class="bg-[#FFF9DF] text-[#17110D]">
    <div id="root"></div>
  </body>
</html>"""
    response = HttpResponse(latest_html, content_type='text/html')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


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
    re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': settings.MEDIA_ROOT}),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Catch-all route to serve the React Single Page App and static dist files
urlpatterns += [
    re_path(r'^(?P<resource>(?!api/|admin/|media/|static/).*)$', serve_spa),
]
