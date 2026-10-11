from django.urls import path

from .views import DashboardView, StockAlertsView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('stock-alerts/', StockAlertsView.as_view(), name='stock-alerts'),
]
