from django.utils.translation import gettext as _
from rest_framework import serializers

from catalog.models import Variant, format_size

from .models import CartItem


def available_quantity(variant_id):
    return Variant.objects.with_available().get(id=variant_id).available


class CartItemSerializer(serializers.ModelSerializer):
    """Ligne du panier avec le prix actuel du produit (le prix est fige seulement a la commande)."""

    product = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()
    color = serializers.CharField(source='variant.color.name', read_only=True)
    color_hex = serializers.CharField(source='variant.color.hex_code', read_only=True)
    unit_price = serializers.DecimalField(
        source='variant.product.price', max_digits=12, decimal_places=0, read_only=True
    )
    line_total = serializers.SerializerMethodField()
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id',
            'variant',
            'quantity',
            'product',
            'size',
            'color',
            'color_hex',
            'unit_price',
            'line_total',
            'available',
        ]
        read_only_fields = ['variant']

    def get_product(self, item) -> dict:
        product = item.variant.product
        return {
            'name': product.name,
            'slug': product.slug,
            'brand': product.brand.name,
            'category': product.category.name,
        }

    def get_size(self, item) -> str:
        return format_size(item.variant.size)

    def get_line_total(self, item) -> str:
        return str(item.variant.product.price * item.quantity)

    def validate_quantity(self, quantity):
        if quantity < 1:
            raise serializers.ValidationError(_('La quantité doit être d’au moins 1.'))
        variant_id = self.instance.variant_id if self.instance else self.initial_data.get('variant')
        if variant_id and quantity > available_quantity(variant_id):
            raise serializers.ValidationError(_('Stock insuffisant pour cette pointure.'))
        return quantity


class CartSerializer(serializers.Serializer):
    """Reponse de GET /api/cart/ (documentation de l'API)."""

    items = CartItemSerializer(many=True)
    total = serializers.CharField()
    count = serializers.IntegerField()


class AddToCartSerializer(serializers.Serializer):
    variant = serializers.PrimaryKeyRelatedField(queryset=Variant.objects.select_related('product'))
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate_variant(self, variant):
        if not variant.product.is_published:
            raise serializers.ValidationError(_('Ce produit n’est pas disponible.'))
        return variant

    def validate(self, attrs):
        cart = self.context['cart']
        already = cart.items.filter(variant=attrs['variant']).values_list('quantity', flat=True).first() or 0
        # Ce qui est deja dans le panier compte aussi : on ne depasse jamais le stock disponible
        if already + attrs['quantity'] > available_quantity(attrs['variant'].id):
            raise serializers.ValidationError({'quantity': _('Stock insuffisant pour cette pointure.')})
        return attrs
