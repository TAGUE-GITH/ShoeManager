"""US-19 (alertes de stock) et US-20 (tableau de bord du gerant)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from accounts.models import Role
from catalog.tests.factories import color, product, variant
from orders.models import Order
from reservations.models import Reservation
from sales.models import Sale

DASHBOARD_URL = '/api/manage/dashboard/'
ALERTS_URL = '/api/manage/stock-alerts/'


def sell(client, lines, payment='ESPECES'):
    payload = {'items': [{'variant': v.id, 'quantity': q} for v, q in lines], 'payment_method': payment}
    response = client.post('/api/manage/sales/', payload, format='json')
    assert response.status_code == 201, response.data
    return Sale.objects.get(id=response.data['id'])


def delivered_order(client, staff, pair, quantity=1):
    client.post('/api/cart/items/', {'variant': pair.id, 'quantity': quantity}, format='json')
    data = client.post(
        '/api/orders/', {'delivery_mode': 'RETRAIT', 'payment_method': 'EN_BOUTIQUE', 'phone': '690'}, format='json'
    ).data
    for status in ['CONFIRMEE', 'EN_PREPARATION', 'PRETE', 'LIVREE']:
        staff.patch(f'/api/manage/orders/{data["id"]}/status/', {'status': status}, format='json')
    return Order.objects.get(id=data['id'])


@pytest.fixture
def shop():
    sneakers = product(name='Stan Smith', price=50000)
    heels = product(name='Escarpin Elena', price=20000)
    return {
        'sneakers42': variant(sneakers, size=42, color_=color('Blanc'), stock=10),
        'sneakers43': variant(sneakers, size=43, color_=color('Blanc'), stock=10),
        'heels38': variant(heels, size=38, color_=color('Noir'), stock=10),
    }


@pytest.mark.django_db
class TestDashboard:
    def test_reserved_to_the_manager(self, api, client_for):
        assert api.get(DASHBOARD_URL).status_code == 401
        assert client_for(Role.CLIENT).get(DASHBOARD_URL).status_code == 403
        assert client_for(Role.VENDEUR).get(DASHBOARD_URL).status_code == 403
        assert client_for(Role.GERANT).get(DASHBOARD_URL).status_code == 200

    def test_revenue_splits_store_and_online(self, client_for, shop):
        seller = client_for(Role.VENDEUR)
        sell(seller, [(shop['sneakers42'], 2)])  # 100 000 en boutique
        delivered_order(client_for(Role.CLIENT), seller, shop['heels38'])  # 20 000 en ligne

        revenue = client_for(Role.GERANT).get(DASHBOARD_URL).data['revenue']

        assert revenue['today'] == {'store': '100000', 'online': '20000', 'total': '120000'}
        assert revenue['month']['total'] == '120000'

    def test_old_sales_are_outside_the_month(self, client_for, shop):
        sale = sell(client_for(Role.VENDEUR), [(shop['sneakers42'], 1)])
        Sale.objects.filter(id=sale.id).update(created_at=timezone.now() - timedelta(days=45))

        revenue = client_for(Role.GERANT).get(DASHBOARD_URL).data['revenue']

        assert revenue['month']['total'] == '0'

    def test_cancelled_and_undelivered_orders_do_not_count(self, client_for, shop):
        shopper = client_for(Role.CLIENT)
        shopper.post('/api/cart/items/', {'variant': shop['heels38'].id, 'quantity': 1}, format='json')
        shopper.post(
            '/api/orders/', {'delivery_mode': 'RETRAIT', 'payment_method': 'EN_BOUTIQUE', 'phone': '690'}, format='json'
        )

        data = client_for(Role.GERANT).get(DASHBOARD_URL).data

        assert data['revenue']['today']['online'] == '0'
        assert data['to_handle']['orders'] == 1

    def test_best_sellers_and_sizes_over_30_days(self, client_for, shop):
        seller = client_for(Role.VENDEUR)
        sell(seller, [(shop['sneakers42'], 3), (shop['sneakers43'], 1)])
        sell(seller, [(shop['heels38'], 2)])

        data = client_for(Role.GERANT).get(DASHBOARD_URL).data

        assert data['best_sellers'][0] == {'name': 'Stan Smith', 'quantity': 4, 'revenue': '200000'}
        assert data['best_sellers'][1]['name'] == 'Escarpin Elena'
        assert data['sizes'][0] == {'size': '42', 'quantity': 3}

    def test_daily_revenue_for_the_last_14_days(self, client_for, shop):
        sell(client_for(Role.VENDEUR), [(shop['sneakers42'], 1)])

        daily = client_for(Role.GERANT).get(DASHBOARD_URL).data['daily']

        assert len(daily) == 14
        assert daily[-1]['date'] == timezone.localdate().isoformat()
        assert daily[-1]['store'] == '50000'

    def test_things_to_handle(self, client_for, shop):
        client_for(Role.CLIENT).post('/api/reservations/', {'variant': shop['heels38'].id}, format='json')
        shop['sneakers43'].stock = 1
        shop['sneakers43'].save()

        to_handle = client_for(Role.GERANT).get(DASHBOARD_URL).data['to_handle']

        assert to_handle['reservations'] == Reservation.objects.count() == 1
        assert to_handle['low_stock'] == 1


@pytest.mark.django_db
class TestStockAlerts:
    def test_lists_low_and_sold_out_variants_most_urgent_first(self, client_for, shop):
        shop['sneakers43'].stock = 2
        shop['sneakers43'].save()
        shop['heels38'].stock = 0
        shop['heels38'].save()

        response = client_for(Role.GERANT).get(ALERTS_URL)

        assert response.status_code == 200
        rows = response.data
        assert [(row['product'], row['size'], row['available']) for row in rows] == [
            ('Escarpin Elena', '38', 0),
            ('Stan Smith', '43', 2),
        ]
        assert rows[1]['threshold'] == 3

    def test_reserved_pairs_count_in_the_alert(self, client_for, shop):
        shop['heels38'].stock = 4
        shop['heels38'].save()
        client_for(Role.CLIENT).post('/api/reservations/', {'variant': shop['heels38'].id}, format='json')
        client_for(Role.CLIENT).post('/api/reservations/', {'variant': shop['heels38'].id}, format='json')

        rows = client_for(Role.GERANT).get(ALERTS_URL).data

        # 4 paires en boutique dont 2 reservees : 2 disponibles, sous le seuil de 3
        assert [(row['size'], row['stock'], row['available']) for row in rows] == [('38', 4, 2)]

    def test_reserved_to_the_manager(self, client_for):
        assert client_for(Role.VENDEUR).get(ALERTS_URL).status_code == 403
