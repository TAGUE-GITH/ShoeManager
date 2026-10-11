from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from .models import Brand, Category, Color, Product, ProductImage, Variant, format_size


class SizeField(serializers.DecimalField):
    """Pointure affichee sans decimale inutile : '42', '37.5'."""

    def __init__(self, **kwargs):
        super().__init__(max_digits=4, decimal_places=1, **kwargs)

    def to_representation(self, value):
        return format_size(value)


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug']
        read_only_fields = ['slug']


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ['id', 'name', 'hex_code']


class SwatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ['name', 'hex_code']


class CategoryChildSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class CategoryTreeSerializer(serializers.ModelSerializer):
    children = CategoryChildSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'children']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'position']
        read_only_fields = ['slug']

    def validate_parent(self, parent):
        # Deux niveaux maximum, et une categorie ne peut pas etre sa propre parente
        if parent and parent.parent_id:
            raise serializers.ValidationError(_('Une sous-catégorie ne peut pas avoir de sous-catégorie.'))
        if parent and self.instance and parent.pk == self.instance.pk:
            raise serializers.ValidationError(_('Une catégorie ne peut pas être sa propre parente.'))
        return parent


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'position']


class PublicVariantSerializer(serializers.ModelSerializer):
    size = SizeField(read_only=True)
    color = ColorSerializer(read_only=True)
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = Variant
        fields = ['id', 'sku', 'size', 'color', 'available']


class ProductListSerializer(serializers.ModelSerializer):
    """Carte produit du catalogue."""

    brand = serializers.CharField(source='brand.name')
    category = serializers.CharField(source='category.name')
    image = serializers.SerializerMethodField()
    available_sizes = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'brand', 'category', 'price', 'image', 'available_sizes', 'in_stock', 'colors']

    def get_image(self, product) -> str | None:
        first = next(iter(product.images.all()), None)
        if not first:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(first.image.url) if request else first.image.url

    def _available_variants(self, product):
        # Declinaisons prechargees avec leur stock disponible (voir ProductViewSet.get_queryset)
        return [v for v in product.variants.all() if v.available > 0]

    def get_available_sizes(self, product) -> list[str]:
        return [format_size(size) for size in sorted({v.size for v in self._available_variants(product)})]

    def get_in_stock(self, product) -> bool:
        return bool(self._available_variants(product))

    @extend_schema_field(SwatchSerializer(many=True))
    def get_colors(self, product):
        # Toutes les couleurs du modele (pastilles de la carte produit), sans doublon
        colors = {v.color_id: v.color for v in product.variants.all()}
        return SwatchSerializer(sorted(colors.values(), key=lambda c: c.name), many=True).data


class ProductDetailSerializer(ProductListSerializer):
    images = ImageSerializer(many=True, read_only=True)
    variants = PublicVariantSerializer(many=True, read_only=True)
    category = CategoryTreeSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = [*ProductListSerializer.Meta.fields, 'description', 'images', 'variants']


class ManageProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'category',
            'brand',
            'price',
            'low_stock_threshold',
            'is_published',
            'created_at',
        ]
        read_only_fields = ['slug', 'created_at']

    def validate_price(self, price):
        if price <= 0:
            raise serializers.ValidationError(_('Le prix doit être supérieur à 0.'))
        return price


class ManageVariantSerializer(serializers.ModelSerializer):
    size = SizeField()
    stock = serializers.IntegerField(min_value=0)

    class Meta:
        model = Variant
        fields = ['id', 'product', 'size', 'color', 'stock', 'sku']
        read_only_fields = ['sku']
        validators = [
            UniqueTogetherValidator(
                queryset=Variant.objects.all(),
                fields=['product', 'size', 'color'],
                message=_('Cette pointure existe déjà dans cette couleur pour ce produit.'),
            )
        ]
