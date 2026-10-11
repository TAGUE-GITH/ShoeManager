from django.utils.translation import gettext as _
from rest_framework import serializers

from catalog.models import Variant

from .delivery import DESTINATIONS
from .models import DeliveryMode, Order, OrderItem, OrderStatus, PaymentMethod
from .services import CUSTOMER_CANCELLABLE, next_statuses

# Moyens de paiement possibles pour chaque mode de reception
PAYMENTS_BY_MODE = {
    DeliveryMode.LIVRAISON: [PaymentMethod.A_LA_LIVRAISON, PaymentMethod.MOBILE_MONEY],
    DeliveryMode.RETRAIT: [PaymentMethod.EN_BOUTIQUE, PaymentMethod.MOBILE_MONEY],
}


class PlaceOrderSerializer(serializers.Serializer):
    delivery_mode = serializers.ChoiceField(choices=DeliveryMode.choices)
    delivery_city = serializers.ChoiceField(
        choices=[(key, label) for key, label, _zone in DESTINATIONS], required=False, allow_blank=True
    )
    delivery_address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)

    def validate(self, attrs):
        errors = {}
        if attrs['delivery_mode'] == DeliveryMode.LIVRAISON:
            if not attrs.get('delivery_address', '').strip():
                errors['delivery_address'] = _('Indiquez l’adresse de livraison.')
            if not attrs.get('delivery_city'):
                errors['delivery_city'] = _('Choisissez la ville ou le pays de livraison.')
        if attrs['payment_method'] not in PAYMENTS_BY_MODE[attrs['delivery_mode']]:
            errors['payment_method'] = _('Ce moyen de paiement n’est pas possible pour ce mode de réception.')
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.CharField(source='variant.product.slug', read_only=True)
    color_hex = serializers.CharField(source='variant.color.hex_code', read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product_name',
            'product_slug',
            'size',
            'color',
            'color_hex',
            'quantity',
            'unit_price',
            'line_total',
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    can_cancel = serializers.SerializerMethodField()
    can_add_items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'reference',
            'status',
            'status_label',
            'delivery_mode',
            'delivery_zone',
            'delivery_city',
            'delivery_address',
            'phone',
            'payment_method',
            'is_paid',
            'subtotal',
            'delivery_fee',
            'total',
            'created_at',
            'items',
            'can_cancel',
            'can_add_items',
        ]

    def get_can_cancel(self, order) -> bool:
        return order.status in CUSTOMER_CANCELLABLE

    def get_can_add_items(self, order) -> bool:
        # Meme limite que l'annulation : tant que la preparation n'a pas commence
        return order.status in CUSTOMER_CANCELLABLE


class ManageOrderSerializer(OrderSerializer):
    """Vue boutique : client et etapes suivantes possibles."""

    customer = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()

    class Meta(OrderSerializer.Meta):
        fields = [*OrderSerializer.Meta.fields, 'customer', 'next_statuses']

    def get_customer(self, order) -> dict:
        customer = order.customer
        return {'id': customer.id, 'name': customer.get_full_name(), 'email': customer.email}

    def get_next_statuses(self, order) -> list[dict]:
        return [{'value': status, 'label': OrderStatus(status).label} for status in next_statuses(order)]


class ChangeStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices)


class AddToOrderSerializer(serializers.Serializer):
    variant = serializers.PrimaryKeyRelatedField(queryset=Variant.objects.select_related('product', 'color'))
    quantity = serializers.IntegerField(min_value=1, default=1)


class ReorderSerializer(serializers.Serializer):
    """Reponse de « Commander a nouveau »."""

    added = serializers.IntegerField()
    unavailable = serializers.ListField(child=serializers.CharField())
