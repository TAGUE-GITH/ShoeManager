"""US-03 : mot de passe oublie."""

import re

import pytest
from django.core import mail

from accounts.models import User
from conftest import PASSWORD

REQUEST_URL = '/api/auth/password-reset/'
CONFIRM_URL = '/api/auth/password-reset/confirm/'


def link_params():
    """uid et jeton extraits du lien envoye par email."""
    match = re.search(r'uid=([\w-]+)&token=([\w-]+)', mail.outbox[-1].body)
    return {'uid': match.group(1), 'token': match.group(2)}


@pytest.mark.django_db
class TestPasswordReset:
    def test_sends_a_link_to_an_existing_account(self, api, make_user):
        make_user(email='awa@test.cm')

        response = api.post(REQUEST_URL, {'email': 'AWA@test.cm'}, format='json')

        assert response.status_code == 200
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ['awa@test.cm']
        assert 'http://localhost:5173/reinitialiser?uid=' in mail.outbox[0].body

    def test_same_answer_for_an_unknown_email(self, api, make_user):
        make_user(email='awa@test.cm')
        known = api.post(REQUEST_URL, {'email': 'awa@test.cm'}, format='json')

        unknown = api.post(REQUEST_URL, {'email': 'personne@test.cm'}, format='json')

        assert unknown.status_code == known.status_code == 200
        assert unknown.data == known.data
        assert len(mail.outbox) == 1

    def test_choose_a_new_password_with_the_link(self, api, make_user):
        make_user(email='awa@test.cm')
        api.post(REQUEST_URL, {'email': 'awa@test.cm'}, format='json')

        response = api.post(CONFIRM_URL, {**link_params(), 'password': 'nouveau-secret-2026'}, format='json')

        assert response.status_code == 200
        assert User.objects.get(email='awa@test.cm').check_password('nouveau-secret-2026')

    def test_the_link_works_only_once(self, api, make_user):
        make_user(email='awa@test.cm')
        api.post(REQUEST_URL, {'email': 'awa@test.cm'}, format='json')
        params = link_params()
        api.post(CONFIRM_URL, {**params, 'password': 'nouveau-secret-2026'}, format='json')

        response = api.post(CONFIRM_URL, {**params, 'password': 'encore-un-autre-2026'}, format='json')

        assert response.status_code == 400

    def test_invalid_token_is_refused(self, api, make_user):
        user = make_user(email='awa@test.cm')
        api.post(REQUEST_URL, {'email': 'awa@test.cm'}, format='json')

        response = api.post(CONFIRM_URL, {**link_params(), 'token': 'faux-jeton', 'password': 'x' * 12}, format='json')

        assert response.status_code == 400
        user.refresh_from_db()
        assert user.check_password(PASSWORD)

    def test_new_password_must_be_strong(self, api, make_user):
        make_user(email='awa@test.cm')
        api.post(REQUEST_URL, {'email': 'awa@test.cm'}, format='json')

        response = api.post(CONFIRM_URL, {**link_params(), 'password': '123'}, format='json')

        assert response.status_code == 400
        assert 'password' in response.data
