"""Fonctionnement en production : sante du service, emails par l'API Brevo, limitation des requetes."""

import json
from unittest import mock

import pytest
from django.core import mail
from django.core.mail import EmailMultiAlternatives

from common.mail import BrevoEmailBackend


@pytest.mark.django_db
def test_health_check(api):
    response = api.get('/api/health/')

    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


class TestBrevoEmailBackend:
    def send(self, settings, message):
        settings.BREVO_API_KEY = 'cle-de-test'
        with mock.patch('common.mail.urlopen') as urlopen:
            urlopen.return_value.__enter__.return_value.status = 201
            sent = BrevoEmailBackend().send_messages([message])
        request = urlopen.call_args.args[0]
        return sent, request, json.loads(request.data)

    def test_sends_the_email_through_the_brevo_api(self, settings):
        message = EmailMultiAlternatives(
            'Votre commande', 'Texte', 'FranckShoese <boutique@franckshoese.cm>', ['awa@test.cm']
        )
        message.attach_alternative('<p>HTML</p>', 'text/html')

        sent, request, payload = self.send(settings, message)

        assert sent == 1
        assert request.full_url == 'https://api.brevo.com/v3/smtp/email'
        assert request.get_header('Api-key') == 'cle-de-test'
        assert payload == {
            'sender': {'name': 'FranckShoese', 'email': 'boutique@franckshoese.cm'},
            'to': [{'email': 'awa@test.cm'}],
            'subject': 'Votre commande',
            'textContent': 'Texte',
            'htmlContent': '<p>HTML</p>',
        }

    def test_an_api_error_does_not_break_the_request_when_silent(self, settings):
        settings.BREVO_API_KEY = 'cle-de-test'
        message = EmailMultiAlternatives('Sujet', 'Texte', 'boutique@franckshoese.cm', ['awa@test.cm'])
        with mock.patch('common.mail.urlopen', side_effect=OSError('réseau')):
            assert BrevoEmailBackend(fail_silently=True).send_messages([message]) == 0


@pytest.mark.django_db
def test_password_reset_requests_are_limited(api, settings):
    for _ in range(5):
        api.post('/api/auth/password-reset/', {'email': 'awa@test.cm'}, format='json')

    response = api.post('/api/auth/password-reset/', {'email': 'awa@test.cm'}, format='json')

    assert response.status_code == 429
    assert len(mail.outbox) == 0
