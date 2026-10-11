"""Emails de compte : lien pour choisir (nouveau vendeur) ou reinitialiser (mot de passe oublie) un mot de passe."""

import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

logger = logging.getLogger(__name__)


def password_link(user):
    """Lien a usage unique : le jeton devient invalide des que le mot de passe change (ou apres 30 minutes)."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f'{settings.FRONTEND_URL}/reinitialiser?uid={uid}&token={token}'


def send_password_email(user, invitation=False):
    if invitation:
        subject = 'Bienvenue dans l’équipe FranckShoese'
        intro = (
            'Un compte vendeur vient d’être créé pour vous sur ShoeManager. '
            'Choisissez votre mot de passe avec ce lien (valable 30 minutes) :'
        )
    else:
        subject = 'Réinitialisation de votre mot de passe'
        intro = 'Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 30 minutes, une seule fois) :'
    body = (
        f'Bonjour {user.first_name},\n\n{intro}\n\n{password_link(user)}\n\n'
        'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.\n\nL’équipe FranckShoese'
    )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email])
    except Exception:
        logger.exception('Email de mot de passe non envoyé (%s)', user.email)
