"""Emails envoyes au client : confirmation de commande et changements de statut."""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

MESSAGES = {
    'CONFIRMEE': 'Bonne nouvelle : votre commande est confirmée. Nous la préparons très bientôt.',
    'EN_PREPARATION': 'Votre commande est en cours de préparation.',
    'EXPEDIEE': 'Votre commande est en route. Le livreur vous appellera avant de passer.',
    'PRETE': 'Votre commande vous attend en boutique (Akwa, Douala), du lundi au samedi de 9 h à 19 h.',
    'LIVREE': 'Votre commande a été remise. Merci pour votre confiance !',
    'ANNULEE': 'Votre commande a été annulée.',
}


def send_order_email(order_id, kind):
    from .models import Order

    order = Order.objects.select_related('customer').prefetch_related('items').get(pk=order_id)
    lines = '\n'.join(
        f'- {item.quantity} × {item.product_name}, pointure {item.size}, {item.color}' for item in order.items.all()
    )
    if kind == 'created':
        subject = f'Commande {order.reference} reçue'
        intro = 'Merci pour votre commande ! Nous la confirmons au plus vite.'
    else:
        subject = f'Commande {order.reference} : {order.get_status_display()}'
        intro = MESSAGES.get(order.status, '')

    body = (
        f'Bonjour {order.customer.first_name},\n\n{intro}\n\n'
        f'Commande {order.reference}\n{lines}\n\n'
        f'Total : {order.total:,.0f} FCFA'.replace(',', ' ')
        + f'\nRéception : {order.get_delivery_mode_display()}\n\nL’équipe FranckShoese'
    )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [order.customer.email])
    except Exception:  # un email en echec ne doit jamais annuler une commande
        logger.exception('Email de commande non envoyé (%s, %s)', order.reference, kind)
