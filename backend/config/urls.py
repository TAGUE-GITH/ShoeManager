from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from accounts.urls import manage as accounts_manage
from catalog.urls import manage as catalog_manage
from catalog.urls import shop as catalog_shop
from catalog.views import ImageView
from common.views import HealthView
from orders.urls import manage as orders_manage
from orders.urls import shop as orders_shop
from orders.views import DeliveryView
from reservations.urls import manage as reservations_manage
from reservations.urls import shop as reservations_shop
from sales.urls import manage as sales_manage

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', HealthView.as_view(), name='health'),
    path('api/delivery/', DeliveryView.as_view(), name='delivery'),
    path('api/auth/', include('accounts.urls')),
    path('api/images/<int:pk>/', ImageView.as_view(), name='image'),
    path('api/', include(catalog_shop.urls)),
    path('api/', include(orders_shop.urls)),
    path('api/', include(reservations_shop.urls)),
    path('api/cart/', include('cart.urls')),
    path('api/manage/', include(catalog_manage.urls)),
    path('api/manage/', include(orders_manage.urls)),
    path('api/manage/', include(reservations_manage.urls)),
    path('api/manage/', include(sales_manage.urls)),
    path('api/manage/', include('dashboard.urls')),
    path('api/manage/', include(accounts_manage.urls)),
    # Documentation de l'API generee automatiquement (OpenAPI / Swagger)
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[]), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[]), name='docs'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
