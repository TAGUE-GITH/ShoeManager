from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomerViewSet,
    DemoView,
    LoginView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    TeamViewSet,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('demo/', DemoView.as_view(), name='demo'),
]

# Espace de gestion : equipe (gerant) et fiches clients (gerant, vendeurs)
manage = DefaultRouter()
manage.register('team', TeamViewSet, basename='team')
manage.register('customers', CustomerViewSet, basename='customer')
