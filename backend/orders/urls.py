from rest_framework.routers import DefaultRouter

from .views import ManageOrderViewSet, OrderViewSet

shop = DefaultRouter()
shop.register('orders', OrderViewSet, basename='order')

manage = DefaultRouter()
manage.register('orders', ManageOrderViewSet, basename='manage-order')
