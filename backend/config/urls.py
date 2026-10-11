from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from catalog.urls import manage as catalog_manage
from catalog.urls import shop as catalog_shop

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include(catalog_shop.urls)),
    path('api/manage/', include(catalog_manage.urls)),
    # Documentation de l'API generee automatiquement (OpenAPI / Swagger)
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[]), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[]), name='docs'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
