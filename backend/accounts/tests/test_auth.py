"""US-01 (inscription client) et US-02 (connexion)."""

import pytest

from accounts.models import Role, User
from conftest import PASSWORD

REGISTER_URL = '/api/auth/register/'
LOGIN_URL = '/api/auth/login/'
ME_URL = '/api/auth/me/'


def register_payload(**overrides):
    payload = {
        'email': 'awa.ngono@test.cm',
        'password': 'chaussures-2026',
        'first_name': 'Awa',
        'last_name': 'Ngono',
        'phone': '+237 690 00 00 00',
    }
    return {**payload, **overrides}


@pytest.mark.django_db
class TestRegister:
    def test_creates_a_client_account(self, api):
        response = api.post(REGISTER_URL, register_payload(), format='json')

        assert response.status_code == 201
        user = User.objects.get(email='awa.ngono@test.cm')
        assert user.role == Role.CLIENT
        assert user.check_password('chaussures-2026')
        assert 'password' not in response.data

    def test_returns_tokens_so_the_client_is_logged_in(self, api):
        response = api.post(REGISTER_URL, register_payload(), format='json')

        assert response.data['access'] and response.data['refresh']
        assert response.data['user']['email'] == 'awa.ngono@test.cm'

    def test_cannot_choose_a_staff_role(self, api):
        api.post(REGISTER_URL, register_payload(role=Role.GERANT), format='json')

        assert User.objects.get(email='awa.ngono@test.cm').role == Role.CLIENT

    def test_rejects_an_email_already_used(self, api, make_user):
        make_user(email='awa.ngono@test.cm')

        response = api.post(REGISTER_URL, register_payload(email='AWA.Ngono@test.cm'), format='json')

        assert response.status_code == 400
        assert 'email' in response.data

    def test_rejects_a_short_password(self, api):
        response = api.post(REGISTER_URL, register_payload(password='court'), format='json')

        assert response.status_code == 400
        assert 'password' in response.data

    def test_requires_names(self, api):
        response = api.post(REGISTER_URL, register_payload(first_name='', last_name=''), format='json')

        assert response.status_code == 400
        assert {'first_name', 'last_name'} <= set(response.data)


@pytest.mark.django_db
class TestLogin:
    def test_returns_tokens_and_profile(self, api, make_user):
        make_user(email='vendeur@test.cm', role=Role.VENDEUR)

        response = api.post(LOGIN_URL, {'email': 'vendeur@test.cm', 'password': PASSWORD}, format='json')

        assert response.status_code == 200
        assert response.data['access'] and response.data['refresh']
        assert response.data['user']['role'] == Role.VENDEUR

    def test_email_is_not_case_sensitive(self, api, make_user):
        make_user(email='vendeur@test.cm')

        response = api.post(LOGIN_URL, {'email': 'Vendeur@Test.cm', 'password': PASSWORD}, format='json')

        assert response.status_code == 200

    @pytest.mark.parametrize(
        'email, password', [('vendeur@test.cm', 'mauvais-mot-de-passe'), ('inconnu@test.cm', PASSWORD)]
    )
    def test_same_message_for_wrong_password_and_unknown_email(self, api, make_user, email, password):
        make_user(email='vendeur@test.cm')

        response = api.post(LOGIN_URL, {'email': email, 'password': password}, format='json')

        assert response.status_code == 401
        assert response.data['detail'] == 'Email ou mot de passe incorrect.'

    def test_inactive_account_cannot_log_in(self, api, make_user):
        make_user(email='ancien@test.cm', is_active=False)

        response = api.post(LOGIN_URL, {'email': 'ancien@test.cm', 'password': PASSWORD}, format='json')

        assert response.status_code == 401


@pytest.mark.django_db
class TestMe:
    def test_returns_the_connected_user(self, api, make_user):
        user = make_user(email='client@test.cm')
        api.force_authenticate(user=user)

        response = api.get(ME_URL)

        assert response.status_code == 200
        assert response.data['email'] == 'client@test.cm'
        assert response.data['loyalty_points'] == 0

    def test_requires_authentication(self, api):
        assert api.get(ME_URL).status_code == 401
