"""US-09 : panier du client."""

import pytest

from accounts.models import Role
from catalog.tests.factories import color, product, variant

CART_URL = '/api/cart/'
ITEMS_URL = '/api/cart/items/'


@pytest.fixture
def shopper(client_for):
    return client_for(Role.CLIENT)


@pytest.fixture
def pair():
    return variant(product(name='Air Force 1', price=65000), size=42, color_=color('Blanc'), stock=3)


@pytest.mark.django_db
class TestCart:
    def test_requires_authentication(self, api):
        assert api.get(CART_URL).status_code == 401

    def test_starts_empty(self, shopper):
        response = shopper.get(CART_URL)

        assert response.status_code == 200
        assert response.data['items'] == []
        assert response.data['total'] == '0'
        assert response.data['count'] == 0

    def test_add_a_pair_and_compute_totals(self, shopper, pair):
        response = shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 2}, format='json')

        assert response.status_code == 201
        cart = shopper.get(CART_URL).data
        item = cart['items'][0]
        assert item['quantity'] == 2
        assert item['product']['name'] == 'Air Force 1'
        assert item['size'] == '42'
        assert item['color'] == 'Blanc'
        assert item['line_total'] == '130000'
        assert cart['total'] == '130000'
        assert cart['count'] == 2

    def test_adding_the_same_pair_again_increases_the_quantity(self, shopper, pair):
        shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 1}, format='json')
        shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 1}, format='json')

        cart = shopper.get(CART_URL).data
        assert len(cart['items']) == 1
        assert cart['items'][0]['quantity'] == 2

    def test_cannot_add_more_than_the_available_stock(self, shopper, pair):
        response = shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 4}, format='json')

        assert response.status_code == 400
        assert 'quantity' in response.data

    def test_cannot_exceed_the_stock_by_adding_twice(self, shopper, pair):
        shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 2}, format='json')

        response = shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 2}, format='json')

        assert response.status_code == 400

    def test_a_hidden_product_cannot_be_added(self, shopper):
        hidden = variant(product(name='Brouillon', published=False))

        response = shopper.post(ITEMS_URL, {'variant': hidden.id, 'quantity': 1}, format='json')

        assert response.status_code == 400

    def test_change_the_quantity(self, shopper, pair):
        item = shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 1}, format='json').data

        response = shopper.patch(f'{ITEMS_URL}{item["id"]}/', {'quantity': 3}, format='json')

        assert response.status_code == 200
        assert shopper.get(CART_URL).data['count'] == 3

    def test_quantity_must_stay_positive_and_available(self, shopper, pair):
        item = shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 1}, format='json').data

        assert shopper.patch(f'{ITEMS_URL}{item["id"]}/', {'quantity': 0}, format='json').status_code == 400
        assert shopper.patch(f'{ITEMS_URL}{item["id"]}/', {'quantity': 9}, format='json').status_code == 400

    def test_remove_a_line(self, shopper, pair):
        item = shopper.post(ITEMS_URL, {'variant': pair.id, 'quantity': 1}, format='json').data

        assert shopper.delete(f'{ITEMS_URL}{item["id"]}/').status_code == 204
        assert shopper.get(CART_URL).data['items'] == []

    def test_a_client_cannot_touch_another_cart(self, client_for, pair):
        owner, intruder = client_for(Role.CLIENT), client_for(Role.CLIENT)
        item = owner.post(ITEMS_URL, {'variant': pair.id, 'quantity': 1}, format='json').data

        assert intruder.patch(f'{ITEMS_URL}{item["id"]}/', {'quantity': 2}, format='json').status_code == 404
        assert intruder.delete(f'{ITEMS_URL}{item["id"]}/').status_code == 404

    def test_the_cart_is_kept_between_visits(self, make_user, pair):
        from rest_framework.test import APIClient

        user = make_user()
        first_visit = APIClient()
        first_visit.force_authenticate(user)
        first_visit.post(ITEMS_URL, {'variant': pair.id, 'quantity': 1}, format='json')

        second_visit = APIClient()
        second_visit.force_authenticate(user)

        assert second_visit.get(CART_URL).data['count'] == 1
