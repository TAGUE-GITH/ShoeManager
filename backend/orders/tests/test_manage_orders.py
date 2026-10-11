"""US-12 : traitement des commandes par la boutique ; regles R5 (transitions), R6 (stock) et R13 (fidelite)."""

import pytest
from django.core import mail

from accounts.models import Role, User
from catalog.tests.factories import color, product, variant
from orders.models import Order, OrderStatus

MANAGE_URL = '/api/manage/orders/'


@pytest.fixture
def pair():
    return variant(product(name='Stan Smith', price=55000), size=42, color_=color('Blanc'), stock=5)


def place(client, pair, mode='RETRAIT', quantity=2):
    client.post('/api/cart/items/', {'variant': pair.id, 'quantity': quantity}, format='json')
    payload = (
        {'delivery_mode': 'RETRAIT', 'payment_method': 'EN_BOUTIQUE', 'phone': '690000000'}
        if mode == 'RETRAIT'
        else {
            'delivery_mode': 'LIVRAISON',
            'delivery_zone': 'DOUALA',
            'delivery_address': 'Bonapriso',
            'phone': '690000000',
            'payment_method': 'A_LA_LIVRAISON',
        }
    )
    response = client.post('/api/orders/', payload, format='json')
    assert response.status_code == 201, response.data
    return Order.objects.get(id=response.data['id'])


def move(staff, order, status):
    return staff.patch(f'{MANAGE_URL}{order.id}/status/', {'status': status}, format='json')


@pytest.mark.django_db
class TestAccess:
    def test_staff_sees_every_order_clients_do_not(self, api, client_for, pair):
        place(client_for(Role.CLIENT), pair)

        assert api.get(MANAGE_URL).status_code == 401
        assert client_for(Role.CLIENT).get(MANAGE_URL).status_code == 403
        assert client_for(Role.VENDEUR).get(MANAGE_URL).data['count'] == 1
        assert client_for(Role.GERANT).get(MANAGE_URL).data['count'] == 1

    def test_search_by_reference_or_customer(self, client_for, make_user, pair):
        from rest_framework.test import APIClient

        awa = APIClient()
        awa.force_authenticate(make_user(role=Role.CLIENT, email='awa@test.cm', last_name='Ngono'))
        order = place(awa, pair)
        place(client_for(Role.CLIENT), pair)
        staff = client_for(Role.VENDEUR)

        assert [o['id'] for o in staff.get(MANAGE_URL, {'search': 'ngono'}).data['results']] == [order.id]
        assert [o['id'] for o in staff.get(MANAGE_URL, {'search': order.reference}).data['results']] == [order.id]

    def test_filter_by_status(self, client_for, pair):
        order = place(client_for(Role.CLIENT), pair, quantity=1)
        place(client_for(Role.CLIENT), pair, quantity=1)
        move(client_for(Role.VENDEUR), order, OrderStatus.CONFIRMEE)

        response = client_for(Role.VENDEUR).get(MANAGE_URL, {'status': OrderStatus.CONFIRMEE})

        assert [o['id'] for o in response.data['results']] == [order.id]


@pytest.mark.django_db
class TestTransitions:
    def test_pickup_order_full_lifecycle(self, client_for, pair):
        order = place(client_for(Role.CLIENT), pair)
        seller = client_for(Role.VENDEUR)

        for status in [OrderStatus.CONFIRMEE, OrderStatus.EN_PREPARATION, OrderStatus.PRETE, OrderStatus.LIVREE]:
            response = move(seller, order, status)
            assert response.status_code == 200, (status, response.data)

        order.refresh_from_db()
        assert order.status == OrderStatus.LIVREE
        assert order.is_paid is True

    def test_delivery_order_goes_through_shipped(self, client_for, pair):
        order = place(client_for(Role.CLIENT), pair, mode='LIVRAISON')
        seller = client_for(Role.VENDEUR)
        move(seller, order, OrderStatus.CONFIRMEE)
        move(seller, order, OrderStatus.EN_PREPARATION)

        assert move(seller, order, OrderStatus.PRETE).status_code == 400
        assert move(seller, order, OrderStatus.EXPEDIEE).status_code == 200

    @pytest.mark.parametrize('target', [OrderStatus.EN_PREPARATION, OrderStatus.LIVREE, OrderStatus.EN_ATTENTE])
    def test_steps_cannot_be_skipped(self, client_for, pair, target):
        order = place(client_for(Role.CLIENT), pair)

        response = move(client_for(Role.VENDEUR), order, target)

        assert response.status_code == 400
        order.refresh_from_db()
        assert order.status == OrderStatus.EN_ATTENTE

    def test_physical_stock_decreases_when_preparation_starts(self, client_for, pair):
        order = place(client_for(Role.CLIENT), pair, quantity=2)
        seller = client_for(Role.VENDEUR)
        move(seller, order, OrderStatus.CONFIRMEE)
        pair.refresh_from_db()
        assert pair.stock == 5

        move(seller, order, OrderStatus.EN_PREPARATION)

        pair.refresh_from_db()
        assert pair.stock == 3

    def test_staff_cancelling_during_preparation_puts_the_pairs_back(self, client_for, pair):
        order = place(client_for(Role.CLIENT), pair, quantity=2)
        seller = client_for(Role.VENDEUR)
        move(seller, order, OrderStatus.CONFIRMEE)
        move(seller, order, OrderStatus.EN_PREPARATION)

        assert move(seller, order, OrderStatus.ANNULEE).status_code == 200

        pair.refresh_from_db()
        assert pair.stock == 5

    def test_a_shipped_order_can_no_longer_be_cancelled(self, client_for, pair):
        order = place(client_for(Role.CLIENT), pair, mode='LIVRAISON')
        seller = client_for(Role.VENDEUR)
        for status in [OrderStatus.CONFIRMEE, OrderStatus.EN_PREPARATION, OrderStatus.EXPEDIEE]:
            move(seller, order, status)

        assert move(seller, order, OrderStatus.ANNULEE).status_code == 400

    def test_delivered_order_earns_loyalty_points(self, client_for, make_user, pair):
        customer = make_user(role=Role.CLIENT)
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(customer)
        order = place(client, pair, quantity=2)  # 110 000 FCFA
        seller = client_for(Role.VENDEUR)
        for status in [OrderStatus.CONFIRMEE, OrderStatus.EN_PREPARATION, OrderStatus.PRETE, OrderStatus.LIVREE]:
            move(seller, order, status)

        assert User.objects.get(id=customer.id).loyalty_points == 110

    def test_the_customer_is_emailed_at_each_change(self, client_for, pair, django_capture_on_commit_callbacks):
        order = place(client_for(Role.CLIENT), pair)
        mail.outbox.clear()

        with django_capture_on_commit_callbacks(execute=True):
            move(client_for(Role.VENDEUR), order, OrderStatus.CONFIRMEE)

        assert len(mail.outbox) == 1
        assert order.reference in mail.outbox[0].subject
