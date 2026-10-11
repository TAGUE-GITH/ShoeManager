from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from catalog.models import Variant


class OrderStatus(models.TextChoices):
    EN_ATTENTE = 'EN_ATTENTE', _('En attente')
    CONFIRMEE = 'CONFIRMEE', _('Confirmée')
    EN_PREPARATION = 'EN_PREPARATION', _('En préparation')
    EXPEDIEE = 'EXPEDIEE', _('Expédiée')
    PRETE = 'PRETE', _('Prête en boutique')
    LIVREE = 'LIVREE', _('Livrée')
    ANNULEE = 'ANNULEE', _('Annulée')


# Commandes dont les paires sont retenues mais encore en boutique (regle R2)
PENDING_STATUSES = [OrderStatus.EN_ATTENTE, OrderStatus.CONFIRMEE]


class DeliveryMode(models.TextChoices):
    LIVRAISON = 'LIVRAISON', _('Livraison')
    RETRAIT = 'RETRAIT', _('Retrait en boutique')


class DeliveryZone(models.TextChoices):
    DOUALA = 'DOUALA', _('Douala')
    AUTRE_VILLE = 'AUTRE_VILLE', _('Autre ville')


# Regle R8 : frais de livraison = 10 % du montant des chaussures (10 000 FCFA -> 1 000 FCFA), retrait gratuit
DELIVERY_RATE = Decimal('0.10')


def delivery_fee_for(subtotal):
    return (Decimal(subtotal) * DELIVERY_RATE).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


class PaymentMethod(models.TextChoices):
    A_LA_LIVRAISON = 'A_LA_LIVRAISON', _('À la livraison')
    EN_BOUTIQUE = 'EN_BOUTIQUE', _('En boutique')
    MOBILE_MONEY = 'MOBILE_MONEY', _('Mobile Money (démonstration)')


class Order(models.Model):
    reference = models.CharField(_('référence'), max_length=20, unique=True, blank=True)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='orders', on_delete=models.PROTECT)
    status = models.CharField(_('statut'), max_length=20, choices=OrderStatus.choices, default=OrderStatus.EN_ATTENTE)
    delivery_mode = models.CharField(_('mode de réception'), max_length=10, choices=DeliveryMode.choices)
    delivery_zone = models.CharField(_('zone'), max_length=12, choices=DeliveryZone.choices, blank=True)
    delivery_address = models.CharField(_('adresse de livraison'), max_length=255, blank=True)
    phone = models.CharField(_('téléphone'), max_length=30)
    payment_method = models.CharField(_('paiement'), max_length=20, choices=PaymentMethod.choices)
    is_paid = models.BooleanField(_('payée'), default=False)
    subtotal = models.DecimalField(_('sous-total'), max_digits=12, decimal_places=0)
    delivery_fee = models.DecimalField(_('frais de livraison'), max_digits=12, decimal_places=0, default=0)
    total = models.DecimalField(_('total'), max_digits=12, decimal_places=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('commande')
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.reference

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Reference lisible pour les echanges avec le client : CMD-2026-00042
        if not self.reference:
            self.reference = f'CMD-{self.created_at:%Y}-{self.pk:05d}'
            super().save(update_fields=['reference'])


class OrderItem(models.Model):
    """Ligne de commande : le nom, la pointure, la couleur et le prix sont figes au moment de l'achat (R7)."""

    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    variant = models.ForeignKey(Variant, related_name='order_items', on_delete=models.PROTECT)
    product_name = models.CharField(max_length=160)
    size = models.CharField(max_length=6)
    color = models.CharField(max_length=40)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=0)

    class Meta:
        verbose_name = _('ligne de commande')
        ordering = ['id']

    def __str__(self):
        return f'{self.quantity} × {self.product_name} ({self.size}, {self.color})'

    @property
    def line_total(self):
        return self.unit_price * self.quantity
