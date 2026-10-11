"""US-10 (passer commande), US-11 (suivre ses commandes), US-13 (annuler) ; regles R2, R3, R7, R8."""

import pytest
from django.core import mail

from accounts.models import Role
from catalog.models import Variant
from catalog.tests.factories import color, product, variant
from orders.models import Order, OrderStatus

ORDERS_URL = '/api/orders/'


def delivery(**overrides):
    return {
        'delivery_mode': 'LIVRAISON',
        'delivery_zone': 'DOUALA',
        'delivery_address': 'Akwa, rue Joss, immeuble Sapho',
        'phone': '+237 690 00 00 00',
        'payment_method': 'A_LA_LIVRAISON',
        **overrides,
    }


def pickup(**overrides):
    return {'delivery_mode': 'RETRAIT', 'payment_method': 'EN_BOUTIQUE', 'phone': '+237 690 00 00 00', **overrides}


@pytest.fixture
def pair():
    return variant(product(name='Air Force 1', price=65000), size=42, color_=color('Blanc'), stock=3)


@pytest.fixture
def shopper(client_for):
    return client_for(Role.CLIENT)


def fill_cart(client, pair, quantity=1):
    response = client.post('/api/cart/items/', {'variant': pair.id, 'quantity': quantity}, format='json')
    assert response.status_code == 201, response.data


@pytest.mark.django_db
class TestPlaceOrder:
    def test_creates_a_pending_order_from_the_cart(self, shopper, pair):
        fill_cart(shopper, pair, quantity=2)

        response = shopper.post(ORDERS_URL, delivery(), format='json')

        assert response.status_code == 201, response.data
        order = Order.objects.get()
        assert order.status == OrderStatus.EN_ATTENTE
        assert order.reference.startswith('CMD-')
        assert response.data['reference'] == order.reference
        assert response.data['items'][0]['product_name'] == 'Air Force 1'
        assert response.data['items'][0]['quantity'] == 2

    def test_empties_the_cart(self, shopper, pair):
        fill_cart(shopper, pair)

        shopper.post(ORDERS_URL, delivery(), format='json')

        assert shopper.get('/api/cart/').data['count'] == 0

    @pytest.mark.parametrize(
        'payload, fee',
        [(delivery(), 13000), (delivery(delivery_zone='AUTRE_VILLE'), 13000), (pickup(), 0)],
    )
    def test_delivery_fee_is_ten_percent_of_the_shoes(self, shopper, pair, payload, fee):
        fill_cart(shopper, pair, quantity=2)

        response = shopper.post(ORDERS_URL, payload, format='json')

        assert response.data['delivery_fee'] == str(fee)
        assert response.data['subtotal'] == '130000'
        assert response.data['total'] == str(130000 + fee)

    def test_delivery_fee_is_rounded_to_the_franc(self, shopper):
        cheap = variant(product(name='Tong', price=12345), size=40, color_=color('Noir'), stock=2)
        fill_cart(shopper, cheap)

        response = shopper.post(ORDERS_URL, delivery(), format='json')

        assert response.data['delivery_fee'] == '1235'

    def test_price_is_frozen_in_the_order(self, shopper, pair):
        fill_cart(shopper, pair)
        order_id = shopper.post(ORDERS_URL, pickup(), format='json').data['id']

        pair.product.price = 99000
        pair.product.save()

        assert shopper.get(f'{ORDERS_URL}{order_id}/').data['items'][0]['unit_price'] == '65000'

    def test_ordered_pairs_are_no_longer_available_to_others(self, shopper, pair):
        fill_cart(shopper, pair, quantity=2)

        shopper.post(ORDERS_URL, pickup(), format='json')

        # Stock physique inchange (la paire est encore en boutique) mais retenue pour cette commande
        pair.refresh_from_db()
        assert pair.stock == 3
        assert Variant.objects.with_available().get(id=pair.id).available == 1

    def test_refused_if_the_stock_changed_since_the_pair_was_added(self, client_for, shopper, pair):
        fill_cart(shopper, pair, quantity=2)
        other = client_for(Role.CLIENT)
        fill_cart(other, pair, quantity=2)
        assert other.post(ORDERS_URL, pickup(), format='json').status_code == 201

        response = shopper.post(ORDERS_URL, pickup(), format='json')

        assert response.status_code == 400
        assert 'Air Force 1' in response.data['detail']
        assert Order.objects.count() == 1

    def test_refused_with_an_empty_cart(self, shopper):
        response = shopper.post(ORDERS_URL, pickup(), format='json')

        assert response.status_code == 400

    def test_delivery_requires_an_address(self, shopper, pair):
        fill_cart(shopper, pair)

        response = shopper.post(ORDERS_URL, delivery(delivery_address=''), format='json')

        assert response.status_code == 400
        assert 'delivery_address' in response.data

    @pytest.mark.parametrize(
        'payload',
        [delivery(payment_method='EN_BOUTIQUE'), pickup(payment_method='A_LA_LIVRAISON')],
    )
    def test_payment_method_must_match_the_delivery_mode(self, shopper, pair, payload):
        fill_cart(shopper, pair)

        response = shopper.post(ORDERS_URL, payload, format='json')

        assert response.status_code == 400
        assert 'payment_method' in response.data

    def test_mobile_money_is_paid_immediately_in_demo_mode(self, shopper, pair):
        fill_cart(shopper, pair)

        response = shopper.post(ORDERS_URL, pickup(payment_method='MOBILE_MONEY'), format='json')

        assert response.data['is_paid'] is True

    def test_sends_a_confirmation_email(self, shopper, pair, django_capture_on_commit_callbacks):
        fill_cart(shopper, pair)

        with django_capture_on_commit_callbacks(execute=True):
            reference = shopper.post(ORDERS_URL, pickup(), format='json').data['reference']

        assert len(mail.outbox) == 1
        assert reference in mail.outbox[0].subject
        assert 'Air Force 1' in mail.outbox[0].body


@pytest.mark.django_db
class TestMyOrders:
    def test_lists_only_my_orders_newest_first(self, client_for, pair):
        me, someone = client_for(Role.CLIENT), client_for(Role.CLIENT)
        for client in (me, someone, me):
            fill_cart(client, pair)
            assert client.post(ORDERS_URL, pickup(), format='json').status_code == 201

        response = me.get(ORDERS_URL)

        assert response.data['count'] == 2
        ids = [order['id'] for order in response.data['results']]
        assert ids == sorted(ids, reverse=True)

    def test_another_client_order_is_not_found(self, client_for, pair):
        owner, intruder = client_for(Role.CLIENT), client_for(Role.CLIENT)
        fill_cart(owner, pair)
        order_id = owner.post(ORDERS_URL, pickup(), format='json').data['id']

        assert intruder.get(f'{ORDERS_URL}{order_id}/').status_code == 404


@pytest.mark.django_db
class TestCancel:
    def test_cancel_a_pending_order_releases_the_pairs(self, shopper, pair):
        fill_cart(shopper, pair, quantity=2)
        order_id = shopper.post(ORDERS_URL, pickup(), format='json').data['id']

        response = shopper.post(f'{ORDERS_URL}{order_id}/cancel/')

        assert response.status_code == 200
        assert response.data['status'] == OrderStatus.ANNULEE
        assert Variant.objects.with_available().get(id=pair.id).available == 3

    def test_cannot_cancel_once_in_preparation(self, shopper, pair):
        fill_cart(shopper, pair)
        order_id = shopper.post(ORDERS_URL, pickup(), format='json').data['id']
        Order.objects.filter(id=order_id).update(status=OrderStatus.EN_PREPARATION)

        response = shopper.post(f'{ORDERS_URL}{order_id}/cancel/')

        assert response.status_code == 400
