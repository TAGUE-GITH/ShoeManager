from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from catalog.models import Variant

# Regles R9 et R10
RESERVATION_DURATION = timedelta(hours=48)
MAX_ACTIVE_RESERVATIONS = 3


class ReservationStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', _('Active')
    HONOREE = 'HONOREE', _('Honorée')
    ANNULEE = 'ANNULEE', _('Annulée')
    EXPIREE = 'EXPIREE', _('Expirée')


class ReservationQuerySet(models.QuerySet):
    def holding(self, now=None):
        """Reservations qui bloquent encore leur paire : actives et pas encore arrivees a echeance."""
        return self.filter(status=ReservationStatus.ACTIVE, expires_at__gt=now or timezone.now())


class Reservation(models.Model):
    """Une paire mise de cote pour un essayage en boutique (une declinaison, 48 h)."""

    reference = models.CharField(_('référence'), max_length=20, unique=True, blank=True)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='reservations', on_delete=models.PROTECT)
    variant = models.ForeignKey(Variant, related_name='reservations', on_delete=models.PROTECT)
    status = models.CharField(
        _('statut'), max_length=10, choices=ReservationStatus.choices, default=ReservationStatus.ACTIVE
    )
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(_('échéance'))

    objects = ReservationQuerySet.as_manager()

    class Meta:
        verbose_name = _('réservation')
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['status', 'expires_at'])]

    def __str__(self):
        return self.reference

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = self.created_at + RESERVATION_DURATION
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = f'RES-{self.created_at:%Y}-{self.pk:05d}'
            super().save(update_fields=['reference'])

    @property
    def is_holding(self):
        return self.status == ReservationStatus.ACTIVE and self.expires_at > timezone.now()
