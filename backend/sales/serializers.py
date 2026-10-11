from django.utils.translation import gettext as _
from rest_framework import serializers

from accounts.models import Role, User
from catalog.models import Variant

from .models import Sale, SaleItem, SalePaymentMethod


class SaleItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product_name', 'size', 'color', 'quantity', 'unit_price', 'line_total']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    seller = serializers.CharField(source='seller.get_full_name', read_only=True)
    customer = serializers.SerializerMethodField()
    reservation = serializers.CharField(source='reservation.reference', read_only=True, default=None)

    class Meta:
        model = Sale
        fields = [
            'id',
            'reference',
            'created_at',
            'seller',
            'customer',
            'reservation',
            'payment_method',
            'total',
            'items',
        ]

    def get_customer(self, sale) -> dict | None:
        customer = sale.customer
        return {'name': customer.get_full_name(), 'email': customer.email} if customer else None


class SaleLineSerializer(serializers.Serializer):
    variant = serializers.PrimaryKeyRelatedField(queryset=Variant.objects.all())
    quantity = serializers.IntegerField(min_value=1)


class CreateSaleSerializer(serializers.Serializer):
    items = SaleLineSerializer(many=True)
    payment_method = serializers.ChoiceField(choices=SalePaymentMethod.choices)
    # Client facultatif (fidelite) : retrouve par son email
    customer_email = serializers.EmailField(required=False, allow_blank=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError(_('Ajoutez au moins une paire.'))
        return items

    def validate_customer_email(self, email):
        if not email:
            return None
        customer = User.objects.filter(email__iexact=email, role=Role.CLIENT).first()
        if customer is None:
            raise serializers.ValidationError(_('Aucun client avec cet email.'))
        return customer
