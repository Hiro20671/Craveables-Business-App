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
                elif file_path.suffix == '.txt':
                    content_type = 'text/plain; charset=utf-8'
                elif file_path.suffix == '.xml':
                    content_type = 'application/xml; charset=utf-8'
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
    <title>CRAVEABLES | Fresh Baked Treats in Lucena City • Banana Cake, Brownies &amp; Cookies</title>
    <meta name="title" content="CRAVEABLES | Fresh Baked Treats in Lucena City • Banana Cake, Brownies &amp; Cookies" />
    <meta name="description" content="Small home bakery in Purok St. Teresa, Mayao Parada, Lucena City by Dyna, Jeremy &amp; Anne. Freshly baked Banana Cake with ripe Philippine Lakatan bananas, dense fudgy brownies, and chewy cookies." />
    <meta name="keywords" content="Craveables, Craveables Lucena, Craveables Bakery, Bakery in Lucena City, Mayao Parada bakery, Banana Cake Lucena, Fudgy Brownies Lucena, Red Velvet Cookies Lucena, Lucena City Bakery, Lucena baked goods, Quezon home bakery, baked with love" />
    <meta name="author" content="CRAVEABLES Lucena - Dyna, Jeremy &amp; Anne" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="https://jeremy2005.pythonanywhere.com/" />
    <meta name="google-site-verification" content="google65f93b7ed8cccdd0" />
    <meta name="geo.region" content="PH-QUE" />
    <meta name="geo.placename" content="Purok St. Teresa, Mayao Parada, Lucena City, Quezon Province, Philippines" />
    <meta name="geo.position" content="13.9486;121.6385" />
    <meta name="ICBM" content="13.9486, 121.6385" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://jeremy2005.pythonanywhere.com/" />
    <meta property="og:title" content="CRAVEABLES | Fresh Baked Treats in Lucena City" />
    <meta property="og:description" content="Freshly baked Banana Cake, fudgy brownies, and chewy cookies baked in small batches with love by Dyna, Jeremy, and Anne in Lucena City." />
    <meta property="og:image" content="https://jeremy2005.pythonanywhere.com/poster-classic-brownies.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="CRAVEABLES Fresh Bakes Lucena City" />
    <meta property="og:site_name" content="CRAVEABLES" />
    <meta property="og:locale" content="en_PH" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://jeremy2005.pythonanywhere.com/" />
    <meta name="twitter:title" content="CRAVEABLES | Fresh Baked Treats in Lucena City" />
    <meta name="twitter:description" content="Fresh Banana Cake, Fudgy Brownies, and Chewy Cookies in Lucena City by Dyna, Jeremy &amp; Anne." />
    <meta name="twitter:image" content="https://jeremy2005.pythonanywhere.com/poster-classic-brownies.jpg" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/manifest.json" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Bakery",
      "name": "CRAVEABLES",
      "alternateName": "CRAVEABLES Bakery Lucena",
      "image": [
        "https://jeremy2005.pythonanywhere.com/poster-classic-brownies.jpg",
        "https://jeremy2005.pythonanywhere.com/poster-banana-cake.jpg",
        "https://jeremy2005.pythonanywhere.com/logo.png"
      ],
      "logo": "https://jeremy2005.pythonanywhere.com/logo.png",
      "url": "https://jeremy2005.pythonanywhere.com/",
      "telephone": "+639157973701",
      "priceRange": "₱30 - ₱220",
      "servesCuisine": "Filipino, Bakery, Pastries, Desserts",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Purok St. Teresa, Mayao Parada",
        "addressLocality": "Lucena City",
        "addressRegion": "Quezon Province",
        "postalCode": "4301",
        "addressCountry": "PH"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 13.9486,
        "longitude": 121.6385
      },
      "description": "Small home bakery in Purok St. Teresa, Mayao Parada, Lucena City started by three friends — Dyna, Jeremy, and Anne. Freshly baked Banana Cake with ripe Philippine Lakatan bananas, dense fudgy brownies, and chewy cookies."
    }
    </script>
    <script type="module" crossorigin src="/assets/index-CDCMMTIy.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-CT9PcKvw.css">
  </head>
  <body class="bg-[#FFF9DF] text-[#17110D]">
    <div id="root">
      <noscript>
        <div style="font-family: sans-serif; max-width: 720px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #3B170B;">
          <h1>CRAVEABLES — Freshly Baked Treats in Lucena City</h1>
          <p><strong>Made to Crave • Baked with Love</strong></p>
          <p>We are a small, humble home bakery in Lucena City started by three friends — Dyna, Jeremy, and Anne. Small-batch Lakatan Banana Cake, dense fudgy brownies, and chewy cookies.</p>
        </div>
      </noscript>
    </div>
  </body>
</html>"""
    response = HttpResponse(latest_html, content_type='text/html')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


def serve_robots_txt(request):
    root = Path(settings.BASE_DIR).parent
    for candidate in [root / 'frontend' / 'dist' / 'robots.txt', root / 'frontend' / 'public' / 'robots.txt']:
        if candidate.is_file() and candidate.stat().st_size > 0:
            return HttpResponse(candidate.read_text(encoding='utf-8'), content_type='text/plain; charset=utf-8')
    default_robots = (
        "User-agent: *\n"
        "Allow: /\n"
        "Allow: /manifest.json\n"
        "Allow: /sitemap.xml\n"
        "Disallow: /admin/\n"
        "Disallow: /api/\n"
        "Disallow: /portal\n"
        "Disallow: /dashboard\n"
        "Disallow: /login\n\n"
        "Sitemap: https://jeremy2005.pythonanywhere.com/sitemap.xml\n"
    )
    return HttpResponse(default_robots, content_type='text/plain; charset=utf-8')


def serve_sitemap_xml(request):
    root = Path(settings.BASE_DIR).parent
    for candidate in [root / 'frontend' / 'dist' / 'sitemap.xml', root / 'frontend' / 'public' / 'sitemap.xml']:
        if candidate.is_file() and candidate.stat().st_size > 0:
            return HttpResponse(candidate.read_text(encoding='utf-8'), content_type='application/xml; charset=utf-8')
    default_sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        '  <url>\n'
        '    <loc>https://jeremy2005.pythonanywhere.com/</loc>\n'
        '    <lastmod>2026-11-09</lastmod>\n'
        '    <changefreq>daily</changefreq>\n'
        '    <priority>1.0</priority>\n'
        '  </url>\n'
        '</urlset>\n'
    )
    return HttpResponse(default_sitemap, content_type='application/xml; charset=utf-8')


def serve_google_verification(request, filename='google65f93b7ed8cccdd0.html'):
    return HttpResponse(f"google-site-verification: {filename}\n", content_type='text/html; charset=utf-8')


urlpatterns = [
    re_path(r'^(?P<filename>google[a-zA-Z0-9_-]+\.html)$', serve_google_verification),
    path('robots.txt', serve_robots_txt),
    path('sitemap.xml', serve_sitemap_xml),
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
