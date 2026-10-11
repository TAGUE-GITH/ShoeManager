from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['variant', 'product_name', 'size', 'color', 'quantity', 'unit_price']
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['reference', 'customer', 'status', 'delivery_mode', 'total', 'is_paid', 'created_at']
    list_filter = ['status', 'delivery_mode', 'payment_method', 'is_paid']
    search_fields = ['reference', 'customer__email', 'customer__last_name', 'phone']
    # Les statuts changent par l'API (regles metier et stock), pas a la main
    readonly_fields = ['reference', 'status', 'subtotal', 'delivery_fee', 'total', 'created_at']
    inlines = [OrderItemInline]
