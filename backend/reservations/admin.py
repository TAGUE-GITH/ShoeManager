from django.contrib import admin

from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ['reference', 'customer', 'variant', 'status', 'created_at', 'expires_at']
    list_filter = ['status']
    search_fields = ['reference', 'customer__email', 'customer__last_name', 'variant__product__name']
    # Les statuts changent par l'API (stock et ventes), pas a la main
    readonly_fields = ['reference', 'status', 'created_at', 'expires_at']
