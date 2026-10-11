"""Regle R8 : frais de livraison selon la destination et le nombre de paires."""

import pytest

from accounts.models import Role
from catalog.tests.factories import color, product, variant
from orders.models import DeliveryZone, Order

ORDERS_URL = '/api/orders/'


@pytest.fixture
def pair():
    return variant(product(name='Basket Douala', price=10000), size=42, color_=color('Noir'), stock=20)


@pytest.fixture
def shopper(client_for):
    return client_for(Role.CLIENT)


def order(client, pair, city, pairs=1):
    client.post('/api/cart/items/', {'variant': pair.id, 'quantity': pairs}, format='json')
    payload = {
        'delivery_mode': 'LIVRAISON',
        'delivery_city': city,
        'delivery_address': 'Quartier, rue, repère',
        'phone': '690000000',
        'payment_method': 'A_LA_LIVRAISON',
    }
    return client.post(ORDERS_URL, payload, format='json')


@pytest.mark.django_db
class TestDeliveryFee:
    @pytest.mark.parametrize('pairs', [1, 3])
    def test_douala_is_a_flat_fee(self, shopper, pair, pairs):
        assert order(shopper, pair, 'DOUALA', pairs).data['delivery_fee'] == '1000'

    def test_other_cities_cost_ten_percent_of_the_shoes(self, shopper, pair):
        response = order(shopper, pair, 'YAOUNDE', 2)

        assert response.data['delivery_fee'] == '2000'
        assert response.data['total'] == '22000'

    def test_ten_pairs_or_more_get_ten_percent_off_the_delivery(self, shopper, pair):
        assert order(shopper, pair, 'BAMENDA', 10).data['delivery_fee'] == '9000'

    def test_the_discount_also_applies_in_douala(self, shopper, pair):
        assert order(shopper, pair, 'DOUALA', 10).data['delivery_fee'] == '900'

    def test_abroad_costs_twenty_percent_from_five_pairs(self, shopper, pair):
        response = order(shopper, pair, 'GABON', 5)

        assert response.status_code == 201
        assert response.data['delivery_fee'] == '10000'

    def test_abroad_with_ten_pairs_gets_the_discount_too(self, shopper, pair):
        assert order(shopper, pair, 'TCHAD', 10).data['delivery_fee'] == '18000'

    def test_abroad_needs_at_least_five_pairs(self, shopper, pair):
        response = order(shopper, pair, 'GUINEE', 4)

        assert response.status_code == 400
        assert '5 paires' in str(response.data['delivery_city'])
        assert not Order.objects.exists()

    def test_the_destination_is_required_and_known(self, shopper, pair):
        assert order(shopper, pair, '', 1).status_code == 400
        assert order(shopper, pair, 'PARIS', 1).status_code == 400

    def test_the_order_keeps_the_city_and_its_zone(self, shopper, pair):
        response = order(shopper, pair, 'SOUZA', 1)

        assert response.data['delivery_city'] == 'Souza'
        assert response.data['delivery_zone'] == DeliveryZone.AUTRE_VILLE


@pytest.mark.django_db
def test_destinations_and_rules_are_public(api):
    response = api.get('/api/delivery/')

    assert response.status_code == 200
    destinations = {d['key']: d for d in response.data['destinations']}
    assert destinations['DOUALA']['zone'] == DeliveryZone.DOUALA
    assert destinations['YAOUNDE']['label'] == 'Yaoundé'
    assert destinations['GABON']['zone'] == DeliveryZone.ETRANGER
    assert response.data['rules'] == {
        'douala_fee': 1000,
        'rates': {'AUTRE_VILLE': 10, 'ETRANGER': 20},
        'min_pairs_abroad': 5,
        'bulk_pairs': 10,
        'bulk_discount': 10,
    }
