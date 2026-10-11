"""Ajouter des paires a une commande pas encore preparee ; sinon, commander a nouveau les memes produits."""

import pytest
from rest_framework.test import APIClient

from accounts.models import Role
from catalog.models import Variant
from catalog.tests.factories import color, product, variant
from orders.models import Order, OrderStatus

ORDERS_URL = '/api/orders/'


@pytest.fixture
def pair():
    return variant(product(name='Babies Daisy', price=24000), size=35, color_=color('Bleu marine'), stock=10)


@pytest.fixture
def other():
    return variant(product(name='Stan Smith', price=10000), size=42, color_=color('Blanc'), stock=3)


@pytest.fixture
def shopper(client_for):
    return client_for(Role.CLIENT)


def place(client, pair, quantity=2, city='BAFANG'):
    client.post('/api/cart/items/', {'variant': pair.id, 'quantity': quantity}, format='json')
    payload = {
        'delivery_mode': 'LIVRAISON',
        'delivery_city': city,
        'delivery_address': 'rue 2',
        'phone': '651619171',
        'payment_method': 'A_LA_LIVRAISON',
    }
    response = client.post(ORDERS_URL, payload, format='json')
    assert response.status_code == 201, response.data
    return Order.objects.get(id=response.data['id'])


def add(client, order, variant_, quantity=1):
    return client.post(f'{ORDERS_URL}{order.id}/items/', {'variant': variant_.id, 'quantity': quantity}, format='json')


def available(variant_):
    return Variant.objects.with_available().get(id=variant_.id).available


@pytest.mark.django_db
class TestAddToOrder:
    @pytest.mark.parametrize('status', [OrderStatus.EN_ATTENTE, OrderStatus.CONFIRMEE])
    def test_add_pairs_while_the_order_is_not_prepared(self, shopper, pair, other, status):
        order = place(shopper, pair)
        Order.objects.filter(id=order.id).update(status=status)

        response = add(shopper, order, other)

        assert response.status_code == 200
        assert [(i['product_name'], i['quantity']) for i in response.data['items']] == [
            ('Babies Daisy', 2),
            ('Stan Smith', 1),
        ]
        assert response.data['subtotal'] == '58000'
        # Autre ville : 10 % du nouveau montant
        assert response.data['delivery_fee'] == '5800'
        assert response.data['total'] == '63800'
        assert available(other) == 2

    def test_the_same_pair_increases_its_line(self, shopper, pair):
        order = place(shopper, pair)

        response = add(shopper, order, pair, 3)

        assert [(i['product_name'], i['quantity']) for i in response.data['items']] == [('Babies Daisy', 5)]
        assert available(pair) == 5

    def test_reaching_ten_pairs_gives_the_delivery_discount(self, shopper, pair):
        order = place(shopper, pair, quantity=8, city='DOUALA')

        response = add(shopper, order, pair, 2)

        assert response.data['delivery_fee'] == '900'

    def test_not_more_than_the_available_stock(self, shopper, pair, other):
        order = place(shopper, pair)

        response = add(shopper, order, other, 4)

        assert response.status_code == 400
        assert Order.objects.get(id=order.id).items.count() == 1

    @pytest.mark.parametrize(
        'status', [OrderStatus.EN_PREPARATION, OrderStatus.EXPEDIEE, OrderStatus.LIVREE, OrderStatus.ANNULEE]
    )
    def test_refused_once_the_order_is_being_prepared(self, shopper, pair, other, status):
        order = place(shopper, pair)
        Order.objects.filter(id=order.id).update(status=status)

        response = add(shopper, order, other)

        assert response.status_code == 400
        assert 'nouvelle commande' in response.data['detail']
        assert Order.objects.get(id=order.id).items.count() == 1

    def test_only_on_my_own_orders(self, shopper, client_for, pair, other):
        order = place(shopper, pair)

        assert add(client_for(Role.CLIENT), order, other).status_code == 404

    def test_the_order_says_whether_pairs_can_be_added(self, shopper, pair):
        order = place(shopper, pair)
        assert shopper.get(f'{ORDERS_URL}{order.id}/').data['can_add_items'] is True

        Order.objects.filter(id=order.id).update(status=OrderStatus.EN_PREPARATION)
        assert shopper.get(f'{ORDERS_URL}{order.id}/').data['can_add_items'] is False


@pytest.mark.django_db
class TestReorder:
    def test_puts_the_same_pairs_back_in_the_cart(self, shopper, pair, other):
        order = place(shopper, pair, quantity=2)
        add(shopper, order, other)
        Order.objects.filter(id=order.id).update(status=OrderStatus.LIVREE)

        response = shopper.post(f'{ORDERS_URL}{order.id}/reorder/')

        assert response.status_code == 200
        assert response.data == {'added': 3, 'unavailable': []}
        cart = shopper.get('/api/cart/').data
        assert {(i['product']['name'], i['quantity']) for i in cart['items']} == {
            ('Babies Daisy', 2),
            ('Stan Smith', 1),
        }

    def test_sold_out_or_hidden_products_are_listed(self, shopper, pair, other):
        order = place(shopper, pair)
        add(shopper, order, other)
        Order.objects.filter(id=order.id).update(status=OrderStatus.LIVREE)
        # Les autres paires ont ete vendues entre-temps et le modele est retire de la boutique
        Variant.objects.filter(id=other.id).update(stock=1)
        other.product.is_published = False
        other.product.save()

        response = shopper.post(f'{ORDERS_URL}{order.id}/reorder/')

        assert response.data == {'added': 2, 'unavailable': ['Stan Smith (42)']}

    def test_quantity_is_limited_to_the_stock_left(self, shopper, pair):
        order = place(shopper, pair, quantity=4)
        Order.objects.filter(id=order.id).update(status=OrderStatus.LIVREE)
        Variant.objects.filter(id=pair.id).update(stock=1)

        response = shopper.post(f'{ORDERS_URL}{order.id}/reorder/')

        assert response.data == {'added': 1, 'unavailable': []}

    def test_only_my_own_orders(self, shopper, pair):
        order = place(shopper, pair)
        stranger = APIClient()

        assert stranger.post(f'{ORDERS_URL}{order.id}/reorder/').status_code == 401
