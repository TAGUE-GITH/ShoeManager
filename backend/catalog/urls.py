from rest_framework.routers import DefaultRouter

from . import views

shop = DefaultRouter()
shop.register('products', views.ProductViewSet, basename='product')
shop.register('categories', views.CategoryTreeViewSet, basename='category-tree')
shop.register('brands', views.BrandViewSet, basename='brand')
shop.register('colors', views.ColorViewSet, basename='color')

manage = DefaultRouter()
manage.register('categories', views.ManageCategoryViewSet, basename='manage-category')
manage.register('brands', views.ManageBrandViewSet, basename='manage-brand')
manage.register('colors', views.ManageColorViewSet, basename='manage-color')
manage.register('products', views.ManageProductViewSet, basename='manage-product')
manage.register('variants', views.ManageVariantViewSet, basename='manage-variant')
