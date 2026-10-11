"""US-14 (reserver), US-15 (expiration automatique), US-16 (traitement en boutique) ; regles R2, R9 a R12."""

from datetime import timedelta

import pytest
from django.core import mail
from django.core.management import call_command
from django.utils import timezone

from accounts.models import Role, User
from catalog.models import Variant
from catalog.tests.factories import color, product, variant
from reservations.models import Reservation, ReservationStatus
from sales.models import Sale

URL = '/api/reservations/'
MANAGE_URL = '/api/manage/reservations/'


@pytest.fixture
def pair():
    return variant(product(name='Escarpin Elena', price=29000), size=38, color_=color('Noir'), stock=2)


def available(pair):
    return Variant.objects.with_available().get(id=pair.id).available


@pytest.mark.django_db
class TestReserve:
    def test_reserve_a_pair_for_48_hours(self, client_for, pair):
        response = client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json')

        assert response.status_code == 201, response.data
        reservation = Reservation.objects.get()
        assert reservation.status == ReservationStatus.ACTIVE
        assert reservation.reference.startswith('RES-')
        assert reservation.expires_at - reservation.created_at == timedelta(hours=48)
        assert response.data['product_name'] == 'Escarpin Elena'
        assert response.data['size'] == '38'

    def test_the_reserved_pair_is_no_longer_available(self, client_for, pair):
        client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json')

        pair.refresh_from_db()
        assert pair.stock == 2  # la paire est toujours en boutique
        assert available(pair) == 1

    def test_refused_when_no_pair_is_available(self, client_for, pair):
        for _ in range(2):
            assert client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json').status_code == 201

        response = client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json')

        assert response.status_code == 400

    def test_at_most_three_active_reservations_per_client(self, client_for):
        client = client_for(Role.CLIENT)
        pairs = [variant(product(name=f'Modèle {i}'), stock=3) for i in range(4)]
        for item in pairs[:3]:
            assert client.post(URL, {'variant': item.id}, format='json').status_code == 201

        response = client.post(URL, {'variant': pairs[3].id}, format='json')

        assert response.status_code == 400
        assert '3' in response.data['detail']

    def test_a_hidden_product_cannot_be_reserved(self, client_for):
        hidden = variant(product(name='Brouillon', published=False))

        assert client_for(Role.CLIENT).post(URL, {'variant': hidden.id}, format='json').status_code == 400

    def test_confirmation_email(self, client_for, pair, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            reference = client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json').data['reference']

        assert len(mail.outbox) == 1
        assert reference in mail.outbox[0].subject
        assert 'Escarpin Elena' in mail.outbox[0].body

    def test_list_only_my_reservations(self, client_for, pair):
        mine, other = client_for(Role.CLIENT), client_for(Role.CLIENT)
        mine.post(URL, {'variant': pair.id}, format='json')
        other.post(URL, {'variant': pair.id}, format='json')

        assert mine.get(URL).data['count'] == 1

    def test_cancel_my_reservation_releases_the_pair(self, client_for, pair):
        client = client_for(Role.CLIENT)
        reservation_id = client.post(URL, {'variant': pair.id}, format='json').data['id']

        response = client.post(f'{URL}{reservation_id}/cancel/')

        assert response.status_code == 200
        assert response.data['status'] == ReservationStatus.ANNULEE
        assert available(pair) == 2


@pytest.mark.django_db
class TestExpiration:
    def test_expired_reservations_no_longer_hold_the_pair_even_before_the_task_runs(self, client_for, pair):
        client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json')
        Reservation.objects.update(expires_at=timezone.now() - timedelta(minutes=1))

        assert available(pair) == 2

    def test_the_command_marks_old_reservations_as_expired(self, client_for, pair):
        client = client_for(Role.CLIENT)
        old_id = client.post(URL, {'variant': pair.id}, format='json').data['id']
        recent_id = client.post(URL, {'variant': pair.id}, format='json').data['id']
        Reservation.objects.filter(id=old_id).update(expires_at=timezone.now() - timedelta(hours=1))

        call_command('expire_reservations', verbosity=0)

        assert Reservation.objects.get(id=old_id).status == ReservationStatus.EXPIREE
        assert Reservation.objects.get(id=recent_id).status == ReservationStatus.ACTIVE

    def test_lists_show_expired_reservations_without_the_scheduled_task(self, client_for, pair):
        """Sans tache planifiee (hebergement gratuit), les listes mettent les statuts a jour elles-memes."""
        client = client_for(Role.CLIENT)
        client.post(URL, {'variant': pair.id}, format='json')
        Reservation.objects.update(expires_at=timezone.now() - timedelta(minutes=1))

        assert client.get(URL).data['results'][0]['status'] == ReservationStatus.EXPIREE
        staff = client_for(Role.VENDEUR).get(MANAGE_URL, {'status': ReservationStatus.ACTIVE})
        assert staff.data['count'] == 0

    def test_expired_reservations_do_not_count_in_the_limit_of_three(self, client_for):
        client = client_for(Role.CLIENT)
        pairs = [variant(product(name=f'Modèle {i}'), stock=3) for i in range(4)]
        for item in pairs[:3]:
            client.post(URL, {'variant': item.id}, format='json')
        Reservation.objects.update(expires_at=timezone.now() - timedelta(minutes=1))

        assert client.post(URL, {'variant': pairs[3].id}, format='json').status_code == 201


@pytest.mark.django_db
class TestManageReservations:
    def test_only_staff_can_see_all_reservations(self, api, client_for, pair):
        client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json')

        assert client_for(Role.CLIENT).get(MANAGE_URL).status_code == 403
        response = client_for(Role.VENDEUR).get(MANAGE_URL, {'status': ReservationStatus.ACTIVE})
        assert response.data['count'] == 1
        assert response.data['results'][0]['customer']['name']

    def test_honoured_reservation_becomes_a_sale(self, client_for, make_user, pair):
        from rest_framework.test import APIClient

        customer = make_user(role=Role.CLIENT)
        client = APIClient()
        client.force_authenticate(customer)
        reservation_id = client.post(URL, {'variant': pair.id}, format='json').data['id']

        response = client_for(Role.VENDEUR).post(
            f'{MANAGE_URL}{reservation_id}/honor/', {'payment_method': 'ESPECES'}, format='json'
        )

        assert response.status_code == 200, response.data
        assert Reservation.objects.get(id=reservation_id).status == ReservationStatus.HONOREE
        sale = Sale.objects.get()
        assert sale.reservation_id == reservation_id
        assert sale.customer == customer
        assert sale.total == 29000
        pair.refresh_from_db()
        assert pair.stock == 1
        assert available(pair) == 1
        assert User.objects.get(id=customer.id).loyalty_points == 29

    def test_an_expired_reservation_cannot_be_honoured(self, client_for, pair):
        reservation_id = client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json').data['id']
        Reservation.objects.update(expires_at=timezone.now() - timedelta(minutes=1))

        response = client_for(Role.VENDEUR).post(
            f'{MANAGE_URL}{reservation_id}/honor/', {'payment_method': 'ESPECES'}, format='json'
        )

        assert response.status_code == 400

    def test_staff_can_cancel(self, client_for, pair):
        reservation_id = client_for(Role.CLIENT).post(URL, {'variant': pair.id}, format='json').data['id']

        response = client_for(Role.VENDEUR).post(f'{MANAGE_URL}{reservation_id}/cancel/')

        assert response.status_code == 200
        assert available(pair) == 2
