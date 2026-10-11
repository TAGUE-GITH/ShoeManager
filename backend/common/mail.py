"""
Envoi des emails par l'API HTTP de Brevo.

Les hebergeurs gratuits (Render) bloquent les ports SMTP : on passe donc par l'API web de Brevo.
Activation : EMAIL_BACKEND=common.mail.BrevoEmailBackend et BREVO_API_KEY dans l'environnement.
"""

import json
import logging
from email.utils import parseaddr
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

API_URL = 'https://api.brevo.com/v3/smtp/email'
logger = logging.getLogger(__name__)


def contact(address):
    name, email = parseaddr(address)
    return {'name': name, 'email': email} if name else {'email': email}


class BrevoEmailBackend(BaseEmailBackend):
    def __init__(self, *, fail_silently=False, **kwargs):
        super().__init__(**kwargs)
        self.fail_silently = fail_silently

    def payload(self, message):
        data = {
            'sender': contact(message.from_email or settings.DEFAULT_FROM_EMAIL),
            'to': [contact(address) for address in message.to],
            'subject': message.subject,
            'textContent': message.body,
        }
        html = [content for content, mimetype in getattr(message, 'alternatives', []) if mimetype == 'text/html']
        if html:
            data['htmlContent'] = html[0]
        if message.cc:
            data['cc'] = [contact(address) for address in message.cc]
        if message.bcc:
            data['bcc'] = [contact(address) for address in message.bcc]
        return data

    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            request = Request(
                API_URL,
                data=json.dumps(self.payload(message)).encode(),
                headers={'api-key': settings.BREVO_API_KEY, 'content-type': 'application/json'},
                method='POST',
            )
            try:
                with urlopen(request, timeout=10) as response:
                    if 200 <= response.status < 300:
                        sent += 1
            except OSError:
                logger.exception('Échec de l’envoi de l’email « %s » par Brevo', message.subject)
                if not self.fail_silently:
                    raise
        return sent
