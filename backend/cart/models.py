from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from catalog.models import Variant


class Cart(models.Model):
    """Panier d'un client : un seul par compte, conserve entre deux visites."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name='cart', on_delete=models.CASCADE)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('panier')

    def __str__(self):
        return f'Panier de {self.user}'


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    variant = models.ForeignKey(Variant, related_name='cart_items', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(_('quantité'), validators=[MinValueValidator(1)])
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('ligne de panier')
        ordering = ['added_at']
        constraints = [models.UniqueConstraint(fields=['cart', 'variant'], name='one_line_per_variant_per_cart')]

    def __str__(self):
        return f'{self.quantity} × {self.variant}'
