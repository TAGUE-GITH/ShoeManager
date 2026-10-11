"""Email de confirmation d'une reservation."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from catalog.models import format_size

logger = logging.getLogger(__name__)


def send_reservation_email(reservation_id):
    from .models import Reservation

    reservation = Reservation.objects.select_related('customer', 'variant__product', 'variant__color').get(
        pk=reservation_id
    )
    variant = reservation.variant
    deadline = timezone.localtime(reservation.expires_at).strftime('%d/%m/%Y à %H h %M')
    body = (
        f'Bonjour {reservation.customer.first_name},\n\n'
        f'Votre paire est mise de côté : {variant.product.name}, pointure {format_size(variant.size)}, '
        f'{variant.color.name}.\n\n'
        f'Passez l’essayer en boutique (Akwa, Douala) avant le {deadline}. '
        f'Après cette date, la réservation sera annulée automatiquement.\n\n'
        f'Référence : {reservation.reference}\n\nL’équipe FranckShoese'
    )
    try:
        send_mail(
            f'Réservation {reservation.reference} confirmée',
            body,
            settings.DEFAULT_FROM_EMAIL,
            [reservation.customer.email],
        )
    except Exception:  # un email en echec ne doit jamais annuler la reservation
        logger.exception('Email de réservation non envoyé (%s)', reservation.reference)
