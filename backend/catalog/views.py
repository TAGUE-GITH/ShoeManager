from django.db.models import Prefetch, ProtectedError
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsManager

from .filters import ProductFilter
from .images import prepare_image
from .models import Brand, Category, Color, Product, ProductImage, Variant
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    CategoryTreeSerializer,
    ColorSerializer,
    ImageSerializer,
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
                # Les octets des photos ne sont pas charges pour le catalogue : seulement leur adresse
                Prefetch('images', queryset=ProductImage.objects.defer('data')),
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
    queryset = Product.objects.select_related('brand', 'category').prefetch_related(
        Prefetch('images', queryset=ProductImage.objects.defer('data'))
    )
    search_fields = ['name']

    @extend_schema(
        request=inline_serializer('ImageUpload', {'image': serializers.ImageField()}),
        responses={201: ImageSerializer},
    )
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser])
    def images(self, request, pk=None):
        """Ajoute une photo au produit (redimensionnee et convertie en WebP)."""
        product = self.get_object()
        uploaded = request.FILES.get('image')
        if uploaded is None:
            return Response({'image': [_('Choisissez une photo.')]}, status=status.HTTP_400_BAD_REQUEST)
        image = ProductImage.objects.create(
            product=product, data=prepare_image(uploaded), position=product.images.count()
        )
        return Response(ImageSerializer(image, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ImageView(APIView):
    """Photo d'un produit, publique et mise en cache longtemps (une photo ne change jamais : on en ajoute une autre)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses={(200, 'image/webp'): OpenApiTypes.BINARY})
    def get(self, request, pk):
        image = get_object_or_404(ProductImage, pk=pk)
        response = HttpResponse(bytes(image.data), content_type=image.content_type)
        response['Cache-Control'] = 'public, max-age=31536000, immutable'
        return response


class ManageImageViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Suppression d'une photo de produit (gerant)."""

    permission_classes = [IsManager]
    serializer_class = ImageSerializer
    queryset = ProductImage.objects.defer('data')


class ManageVariantViewSet(viewsets.ModelViewSet):
    """US-06 : declinaisons (pointure + couleur) et stock."""

    permission_classes = [IsManager]
    serializer_class = ManageVariantSerializer
    # Toutes les pointures d'un produit en une fois (une trentaine au plus)
    pagination_class = None
    queryset = Variant.objects.select_related('product', 'color')
    filterset_fields = ['product']
