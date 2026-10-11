"""Regles des reservations (R9 a R12) : 48 h, 3 reservations actives au maximum, expiration automatique."""

from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework.exceptions import ValidationError

from catalog.stock import check_available, lock_variants

from .emails import send_reservation_email
from .models import MAX_ACTIVE_RESERVATIONS, Reservation, ReservationStatus


@transaction.atomic
def reserve(customer, variant):
    """US-14 : met une paire de cote pour un essayage en boutique."""
    if not variant.product.is_published:
        raise ValidationError({'detail': _('Ce produit n’est pas disponible.')})
    if Reservation.objects.holding().filter(customer=customer).count() >= MAX_ACTIVE_RESERVATIONS:
        raise ValidationError(
            {
                'detail': _('Vous avez déjà %(max)s réservations en cours : c’est le maximum.')
                % {'max': MAX_ACTIVE_RESERVATIONS}
            }
        )
    lock_variants([variant.id])
    check_available([(variant, 1)], _('Plus aucune paire disponible pour : %(names)s.'))
    reservation = Reservation.objects.create(customer=customer, variant=variant)
    transaction.on_commit(lambda: send_reservation_email(reservation.pk))
    return reservation


def cancel(reservation):
    """Annulation par le client ou la boutique : la paire redevient disponible."""
    if reservation.status != ReservationStatus.ACTIVE:
        raise ValidationError({'detail': _('Cette réservation n’est plus active.')})
    reservation.status = ReservationStatus.ANNULEE
    reservation.save(update_fields=['status'])
    return reservation


@transaction.atomic
def honor(reservation, seller, payment_method):
    """US-16 : le client est venu et achete la paire : la reservation devient une vente."""
    from sales.services import create_sale

    reservation = Reservation.objects.select_for_update().select_related('variant__product').get(pk=reservation.pk)
    if not reservation.is_holding:
        raise ValidationError({'detail': _('Cette réservation n’est plus active (expirée, annulée ou déjà honorée).')})
    return create_sale(
        seller,
        [(reservation.variant, 1)],
        payment_method,
        customer=reservation.customer,
        reservation=reservation,
    )


def expire_reservations(now=None):
    """US-15 : passe au statut EXPIREE les reservations non honorees apres 48 h ; renvoie leur nombre."""
    return Reservation.objects.filter(status=ReservationStatus.ACTIVE, expires_at__lte=now or timezone.now()).update(
        status=ReservationStatus.EXPIREE
    )
