from rest_framework.routers import DefaultRouter

from .views import SaleViewSet

manage = DefaultRouter()
manage.register('sales', SaleViewSet, basename='manage-sale')
