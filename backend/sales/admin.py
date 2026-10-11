from django.contrib import admin

from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    can_delete = False
    readonly_fields = ['variant', 'product_name', 'size', 'color', 'quantity', 'unit_price']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['reference', 'created_at', 'seller', 'customer', 'payment_method', 'total']
    list_filter = ['payment_method', 'seller']
    search_fields = ['reference', 'customer__email']
    readonly_fields = ['reference', 'seller', 'customer', 'reservation', 'total', 'created_at']
    inlines = [SaleItemInline]
