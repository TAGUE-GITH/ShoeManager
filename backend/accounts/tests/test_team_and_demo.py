"""US-04 (equipe), US-21 (fiches clients) et US-22 (compte de demonstration)."""

import pytest
from django.core import mail

from accounts.models import Role, User
from catalog.models import Product

TEAM_URL = '/api/manage/team/'
CUSTOMERS_URL = '/api/manage/customers/'
DEMO_URL = '/api/auth/demo/'


@pytest.mark.django_db
class TestTeam:
    def test_only_the_manager_manages_the_team(self, api, client_for):
        assert api.get(TEAM_URL).status_code == 401
        assert client_for(Role.VENDEUR).get(TEAM_URL).status_code == 403
        assert client_for(Role.GERANT).get(TEAM_URL).status_code == 200

    def test_lists_staff_only(self, client_for, make_user):
        manager = client_for(Role.GERANT)
        make_user(role=Role.VENDEUR, email='paul@test.cm')
        make_user(role=Role.CLIENT, email='client@test.cm')

        emails = [member['email'] for member in manager.get(TEAM_URL).data]

        assert 'paul@test.cm' in emails
        assert 'client@test.cm' not in emails

    def test_create_a_seller_who_receives_a_link_to_choose_a_password(self, client_for):
        response = client_for(Role.GERANT).post(
            TEAM_URL, {'email': 'Nina@test.cm', 'first_name': 'Nina', 'last_name': 'Mbappe'}, format='json'
        )

        assert response.status_code == 201, response.data
        seller = User.objects.get(email='nina@test.cm')
        assert seller.role == Role.VENDEUR
        assert not seller.has_usable_password()
        assert mail.outbox[-1].to == ['nina@test.cm']
        assert '/reinitialiser?uid=' in mail.outbox[-1].body

    def test_email_must_be_unique(self, client_for, make_user):
        make_user(email='nina@test.cm')

        response = client_for(Role.GERANT).post(
            TEAM_URL, {'email': 'nina@test.cm', 'first_name': 'Nina', 'last_name': 'M'}, format='json'
        )

        assert response.status_code == 400

    def test_deactivate_a_seller(self, client_for, make_user):
        seller = make_user(role=Role.VENDEUR)

        response = client_for(Role.GERANT).patch(f'{TEAM_URL}{seller.id}/', {'is_active': False}, format='json')

        assert response.status_code == 200
        assert not User.objects.get(id=seller.id).is_active

    def test_the_manager_cannot_deactivate_or_demote_themselves(self, api, make_user):
        manager = make_user(role=Role.GERANT)
        api.force_authenticate(manager)

        assert api.patch(f'{TEAM_URL}{manager.id}/', {'is_active': False}, format='json').status_code == 400
        assert api.patch(f'{TEAM_URL}{manager.id}/', {'role': Role.VENDEUR}, format='json').status_code == 400

    def test_clients_cannot_be_edited_through_the_team(self, client_for, make_user):
        customer = make_user(role=Role.CLIENT)

        assert (
            client_for(Role.GERANT).patch(f'{TEAM_URL}{customer.id}/', {'is_active': False}, format='json').status_code
            == 404
        )


@pytest.mark.django_db
class TestCustomers:
    def test_staff_can_search_customers(self, client_for, make_user):
        make_user(role=Role.CLIENT, email='awa@test.cm', first_name='Awa', last_name='Ngono', loyalty_points=40)
        make_user(role=Role.CLIENT, email='marc@test.cm', first_name='Marc', last_name='Tchoua')

        response = client_for(Role.VENDEUR).get(CUSTOMERS_URL, {'search': 'ngono'})

        assert response.status_code == 200
        assert [(c['email'], c['loyalty_points']) for c in response.data['results']] == [('awa@test.cm', 40)]

    def test_clients_cannot_list_customers(self, client_for):
        assert client_for(Role.CLIENT).get(CUSTOMERS_URL).status_code == 403


@pytest.mark.django_db
class TestDemo:
    @pytest.mark.parametrize('role', [Role.CLIENT, Role.VENDEUR, Role.GERANT])
    def test_logs_in_a_demo_account_of_the_chosen_role(self, api, role):
        response = api.post(DEMO_URL, {'role': role}, format='json')

        assert response.status_code == 200
        assert response.data['user']['role'] == role
        assert response.data['user']['email'].endswith('@franckshoese.example')
        assert response.data['access']

    def test_fills_the_catalog_when_it_is_empty(self, api):
        assert Product.objects.count() == 0

        api.post(DEMO_URL, {'role': Role.CLIENT}, format='json')

        assert Product.objects.count() >= 12

    @pytest.mark.parametrize('settings_value', [False])
    def test_can_be_disabled(self, api, settings, settings_value):
        settings.DEMO_ENABLED = settings_value

        assert api.post(DEMO_URL, {'role': Role.CLIENT}, format='json').status_code == 404
