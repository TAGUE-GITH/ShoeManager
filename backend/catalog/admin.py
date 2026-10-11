from django.contrib import admin

from .models import Brand, Category, Color, Product, ProductImage, Variant


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'position', 'slug']
    list_editable = ['position']
    list_filter = ['parent']
    search_fields = ['name']


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    search_fields = ['name']


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ['name', 'hex_code']


class VariantInline(admin.TabularInline):
    model = Variant
    extra = 1
    readonly_fields = ['sku']


class ImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'category', 'price', 'is_published', 'created_at']
    list_filter = ['is_published', 'category', 'brand']
    search_fields = ['name', 'brand__name']
    inlines = [VariantInline, ImageInline]
