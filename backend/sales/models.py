from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from catalog.models import Variant
from reservations.models import Reservation


class SalePaymentMethod(models.TextChoices):
    ESPECES = 'ESPECES', _('Espèces')
    MOBILE_MONEY = 'MOBILE_MONEY', _('Mobile Money')
    CARTE = 'CARTE', _('Carte bancaire')


class Sale(models.Model):
    """Vente en boutique (caisse), eventuellement issue d'une reservation."""

    reference = models.CharField(_('référence'), max_length=20, unique=True, blank=True)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sales_made', on_delete=models.PROTECT)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='purchases', null=True, blank=True, on_delete=models.PROTECT
    )
    reservation = models.OneToOneField(
        Reservation, related_name='sale', null=True, blank=True, on_delete=models.PROTECT
    )
    payment_method = models.CharField(_('paiement'), max_length=15, choices=SalePaymentMethod.choices)
    total = models.DecimalField(_('total'), max_digits=12, decimal_places=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('vente')
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.reference

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = f'VTE-{self.created_at:%Y}-{self.pk:05d}'
            super().save(update_fields=['reference'])


class SaleItem(models.Model):
    """Ligne de vente : produit, pointure, couleur et prix figes (comme une commande)."""

    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    variant = models.ForeignKey(Variant, related_name='sale_items', on_delete=models.PROTECT)
    product_name = models.CharField(max_length=160)
    size = models.CharField(max_length=6)
    color = models.CharField(max_length=40)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=0)

    class Meta:
        verbose_name = _('ligne de vente')
        ordering = ['id']

    def __str__(self):
        return f'{self.quantity} × {self.product_name} ({self.size}, {self.color})'

    @property
    def line_total(self):
        return self.unit_price * self.quantity
