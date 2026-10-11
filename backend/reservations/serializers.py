from rest_framework import serializers

from catalog.models import Variant, format_size
from sales.models import SalePaymentMethod

from .models import Reservation


class ReservationSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    product_slug = serializers.CharField(source='variant.product.slug', read_only=True)
    brand = serializers.CharField(source='variant.product.brand.name', read_only=True)
    price = serializers.DecimalField(source='variant.product.price', max_digits=12, decimal_places=0, read_only=True)
    size = serializers.SerializerMethodField()
    color = serializers.CharField(source='variant.color.name', read_only=True)
    color_hex = serializers.CharField(source='variant.color.hex_code', read_only=True)
    is_holding = serializers.BooleanField(read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id',
            'reference',
            'status',
            'created_at',
            'expires_at',
            'is_holding',
            'variant',
            'product_name',
            'product_slug',
            'brand',
            'price',
            'size',
            'color',
            'color_hex',
        ]
        read_only_fields = ['reference', 'status', 'created_at', 'expires_at']

    def get_size(self, reservation) -> str:
        return format_size(reservation.variant.size)


class CreateReservationSerializer(serializers.Serializer):
    variant = serializers.PrimaryKeyRelatedField(queryset=Variant.objects.select_related('product'))


class ManageReservationSerializer(ReservationSerializer):
    customer = serializers.SerializerMethodField()
    sale = serializers.SerializerMethodField()

    class Meta(ReservationSerializer.Meta):
        fields = [*ReservationSerializer.Meta.fields, 'customer', 'sale']

    def get_customer(self, reservation) -> dict:
        customer = reservation.customer
        return {'id': customer.id, 'name': customer.get_full_name(), 'email': customer.email, 'phone': customer.phone}

    def get_sale(self, reservation) -> dict | None:
        sale = getattr(reservation, 'sale', None)
        return {'id': sale.id, 'reference': sale.reference} if sale else None


class HonorSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=SalePaymentMethod.choices)
