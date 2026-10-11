from rest_framework.routers import DefaultRouter

from .views import ManageReservationViewSet, ReservationViewSet

shop = DefaultRouter()
shop.register('reservations', ReservationViewSet, basename='reservation')

manage = DefaultRouter()
manage.register('reservations', ManageReservationViewSet, basename='manage-reservation')
