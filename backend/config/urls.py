from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, FileResponse
from pathlib import Path

def serve_spa(request):
    frontend_dist = settings.BASE_DIR.parent / 'frontend' / 'dist'
    index_file = frontend_dist / 'index.html'
    if index_file.exists():
        return FileResponse(open(index_file, 'rb'))
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

# Catch-all route to serve the React Single Page App
urlpatterns += [
    re_path(r'^(?!api/|admin/|media/|static/).*$', serve_spa),
]
