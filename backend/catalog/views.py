from django.db.models import Prefetch, ProtectedError
from django.utils.translation import gettext as _
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from common.permissions import IsManager

from .filters import ProductFilter
from .models import Brand, Category, Color, Product, Variant
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    CategoryTreeSerializer,
    ColorSerializer,
    ManageProductSerializer,
    ManageVariantSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)

# ---------- Boutique (public) ----------


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """US-07 et US-08 : catalogue et fiche produit (produits visibles uniquement)."""

    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    lookup_field = 'slug'

    def get_queryset(self):
        return (
            Product.objects.filter(is_published=True)
            .select_related('brand', 'category__parent')
            .prefetch_related(
                'images',
                'category__children',
                Prefetch('variants', queryset=Variant.objects.with_available().select_related('color')),
            )
        )

    def get_serializer_class(self):
        return ProductDetailSerializer if self.action == 'retrieve' else ProductListSerializer


class CategoryTreeViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Arbre des categories pour la navigation de la boutique."""

    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = CategoryTreeSerializer
    queryset = Category.objects.filter(parent__isnull=True).prefetch_related('children')


class BrandViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = BrandSerializer
    queryset = Brand.objects.all()


class ColorViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = ColorSerializer
    queryset = Color.objects.all()


# ---------- Espace de gestion (gerant) ----------


class ProtectedDeleteMixin:
    """Suppression refusee (400) si l'element est encore utilise, au lieu d'une erreur serveur."""

    protected_message = ''

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({'detail': _(self.protected_message)}, status=status.HTTP_400_BAD_REQUEST)


class ManageCategoryViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    """US-05 : categories et sous-categories."""

    permission_classes = [IsManager]
    pagination_class = None
    serializer_class = CategorySerializer
    queryset = Category.objects.select_related('parent')
    protected_message = (
        'Cette catégorie contient des produits ou des sous-catégories : elle ne peut pas être supprimée.'
    )


class ManageBrandViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [IsManager]
    pagination_class = None
    serializer_class = BrandSerializer
    queryset = Brand.objects.all()
    protected_message = 'Cette marque est utilisée par des produits.'


class ManageColorViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [IsManager]
    pagination_class = None
    serializer_class = ColorSerializer
    queryset = Color.objects.all()
    protected_message = 'Cette couleur est utilisée par des déclinaisons.'


class ManageProductViewSet(viewsets.ModelViewSet):
    """US-06 : produits, y compris ceux masques de la boutique."""

    permission_classes = [IsManager]
    serializer_class = ManageProductSerializer
    queryset = Product.objects.select_related('brand', 'category')
    search_fields = ['name']


class ManageVariantViewSet(viewsets.ModelViewSet):
    """US-06 : declinaisons (pointure + couleur) et stock."""

    permission_classes = [IsManager]
    serializer_class = ManageVariantSerializer
    queryset = Variant.objects.select_related('product', 'color')
    filterset_fields = ['product']
