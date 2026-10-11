"""US-17 (caisse) et US-18 (recu PDF)."""

import pytest

from accounts.models import Role, User
from catalog.models import Variant
from catalog.tests.factories import color, product, variant
from sales.models import Sale

URL = '/api/manage/sales/'


@pytest.fixture
def pairs():
    sneakers = variant(product(name='Stan Smith', price=55000), size=42, color_=color('Blanc'), stock=4)
    sandals = variant(product(name='Sandale Kribi', price=12000), size=38, color_=color('Beige'), stock=1)
    return sneakers, sandals


def sell(client, lines, **extra):
    payload = {'items': [{'variant': v.id, 'quantity': q} for v, q in lines], 'payment_method': 'ESPECES', **extra}
    return client.post(URL, payload, format='json')


@pytest.mark.django_db
class TestCheckout:
    def test_only_staff_can_use_the_till(self, api, client_for, pairs):
        assert sell(api, [(pairs[0], 1)]).status_code == 401
        assert sell(client_for(Role.CLIENT), [(pairs[0], 1)]).status_code == 403

    def test_record_an_anonymous_sale(self, client_for, pairs):
        sneakers, sandals = pairs

        response = sell(client_for(Role.VENDEUR), [(sneakers, 2), (sandals, 1)], payment_method='MOBILE_MONEY')

        assert response.status_code == 201, response.data
        sale = Sale.objects.get()
        assert sale.reference.startswith('VTE-')
        assert sale.total == 2 * 55000 + 12000
        assert sale.customer is None
        assert response.data['items'][0]['product_name'] == 'Stan Smith'

    def test_physical_stock_decreases_immediately(self, client_for, pairs):
        sneakers, _ = pairs

        sell(client_for(Role.VENDEUR), [(sneakers, 3)])

        sneakers.refresh_from_db()
        assert sneakers.stock == 1

    def test_cannot_sell_a_pair_held_by_an_online_order(self, client_for, pairs):
        _, sandals = pairs
        shopper = client_for(Role.CLIENT)
        shopper.post('/api/cart/items/', {'variant': sandals.id, 'quantity': 1}, format='json')
        assert (
            shopper.post(
                '/api/orders/',
                {'delivery_mode': 'RETRAIT', 'payment_method': 'EN_BOUTIQUE', 'phone': '690'},
                format='json',
            ).status_code
            == 201
        )

        response = sell(client_for(Role.VENDEUR), [(sandals, 1)])

        assert response.status_code == 400
        assert 'Sandale Kribi' in response.data['detail']
        assert Variant.objects.get(id=sandals.id).stock == 1

    def test_linked_customer_earns_loyalty_points(self, client_for, make_user, pairs):
        customer = make_user(role=Role.CLIENT, email='fidele@test.cm')

        response = sell(client_for(Role.VENDEUR), [(pairs[0], 1)], customer_email='Fidele@test.cm')

        assert response.status_code == 201
        assert User.objects.get(id=customer.id).loyalty_points == 55
        assert response.data['customer']['email'] == 'fidele@test.cm'

    def test_unknown_customer_email_is_refused(self, client_for, pairs):
        response = sell(client_for(Role.VENDEUR), [(pairs[0], 1)], customer_email='inconnu@test.cm')

        assert response.status_code == 400
        assert 'customer_email' in response.data

    def test_a_sale_needs_at_least_one_line(self, client_for):
        assert sell(client_for(Role.VENDEUR), []).status_code == 400

    def test_list_sales_newest_first(self, client_for, pairs):
        seller = client_for(Role.VENDEUR)
        sell(seller, [(pairs[0], 1)])
        sell(seller, [(pairs[0], 1)])

        response = seller.get(URL)

        ids = [sale['id'] for sale in response.data['results']]
        assert ids == sorted(ids, reverse=True)


@pytest.mark.django_db
class TestReceipt:
    def test_pdf_receipt(self, client_for, pairs):
        seller = client_for(Role.VENDEUR)
        sale = sell(seller, [(pairs[0], 2)]).data

        response = seller.get(f'{URL}{sale["id"]}/receipt/')

        assert response.status_code == 200
        assert response['Content-Type'] == 'application/pdf'
        content = b''.join(response.streaming_content) if response.streaming else response.content
        assert content.startswith(b'%PDF')
        # Le recu reprend la reference, le modele, la pointure et le total
        assert sale['reference'].encode() in content
        assert b'Stan Smith' in content
        assert b'110' in content

    def test_customers_cannot_download_receipts(self, client_for, pairs):
        sale = sell(client_for(Role.VENDEUR), [(pairs[0], 1)]).data

        assert client_for(Role.CLIENT).get(f'{URL}{sale["id"]}/receipt/').status_code == 403
