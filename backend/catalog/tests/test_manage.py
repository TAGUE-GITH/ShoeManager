"""US-05 (categories) et US-06 (produits et declinaisons) : espace de gestion, reserve au gerant."""

import pytest

from accounts.models import Role
from catalog.models import Category, Product, Variant
from catalog.tests.factories import brand, category, color, product, variant


@pytest.mark.django_db
class TestPermissions:
    @pytest.mark.parametrize('url', ['/api/manage/categories/', '/api/manage/products/', '/api/manage/variants/'])
    def test_only_the_manager_can_manage_the_catalog(self, api, client_for, url):
        assert api.get(url).status_code == 401
        assert client_for(Role.CLIENT).get(url).status_code == 403
        assert client_for(Role.VENDEUR).get(url).status_code == 403
        assert client_for(Role.GERANT).get(url).status_code == 200


@pytest.mark.django_db
class TestCategories:
    def test_create_a_subcategory(self, client_for):
        manager = client_for(Role.GERANT)
        women = category('Femmes')

        response = manager.post('/api/manage/categories/', {'name': 'Sandales', 'parent': women.id}, format='json')

        assert response.status_code == 201
        created = Category.objects.get(name='Sandales')
        assert created.parent == women
        assert created.slug == 'sandales'

    def test_same_name_in_two_parents_gets_distinct_slugs(self, client_for):
        manager = client_for(Role.GERANT)
        men, women = category('Hommes'), category('Femmes')

        manager.post('/api/manage/categories/', {'name': 'Baskets', 'parent': men.id}, format='json')
        manager.post('/api/manage/categories/', {'name': 'Baskets', 'parent': women.id}, format='json')

        assert Category.objects.filter(name='Baskets').values_list('slug', flat=True).distinct().count() == 2

    def test_a_category_with_products_cannot_be_deleted(self, client_for):
        used = category('Baskets')
        product(category_=used)

        response = client_for(Role.GERANT).delete(f'/api/manage/categories/{used.id}/')

        assert response.status_code == 400
        assert Category.objects.filter(id=used.id).exists()

    def test_an_empty_category_can_be_deleted(self, client_for):
        empty = category('Vide')

        assert client_for(Role.GERANT).delete(f'/api/manage/categories/{empty.id}/').status_code == 204


@pytest.mark.django_db
class TestProducts:
    def payload(self, **overrides):
        return {
            'name': 'Stan Smith',
            'description': 'Basket blanche en cuir.',
            'category': category('Baskets').id,
            'brand': brand('Adidas').id,
            'price': 55000,
            'is_published': True,
            **overrides,
        }

    def test_create_a_product(self, client_for):
        response = client_for(Role.GERANT).post('/api/manage/products/', self.payload(), format='json')

        assert response.status_code == 201
        created = Product.objects.get(name='Stan Smith')
        assert created.slug == 'stan-smith'
        assert created.low_stock_threshold == 3

    @pytest.mark.parametrize('price', [0, -5000])
    def test_price_must_be_positive(self, client_for, price):
        response = client_for(Role.GERANT).post('/api/manage/products/', self.payload(price=price), format='json')

        assert response.status_code == 400
        assert 'price' in response.data

    def test_hide_a_product_without_deleting_it(self, api, client_for):
        item = product(name='Air Force 1')

        client_for(Role.GERANT).patch(f'/api/manage/products/{item.id}/', {'is_published': False}, format='json')

        assert Product.objects.filter(id=item.id).exists()
        assert api.get('/api/products/').data['count'] == 0

    def test_manager_list_includes_hidden_products(self, client_for):
        product(name='Brouillon', published=False)

        response = client_for(Role.GERANT).get('/api/manage/products/')

        assert [p['name'] for p in response.data['results']] == ['Brouillon']


@pytest.mark.django_db
class TestVariants:
    def test_add_a_variant_with_stock(self, client_for):
        item = product()
        white = color('Blanc')

        response = client_for(Role.GERANT).post(
            '/api/manage/variants/', {'product': item.id, 'size': '42', 'color': white.id, 'stock': 8}, format='json'
        )

        assert response.status_code == 201
        created = Variant.objects.get(product=item)
        assert created.stock == 8
        assert created.sku  # reference generee automatiquement

    def test_size_and_color_pair_is_unique_per_product(self, client_for):
        item = product()
        white = color('Blanc')
        variant(item, size=42, color_=white)

        response = client_for(Role.GERANT).post(
            '/api/manage/variants/', {'product': item.id, 'size': '42', 'color': white.id, 'stock': 2}, format='json'
        )

        assert response.status_code == 400

    def test_stock_cannot_be_negative(self, client_for):
        response = client_for(Role.GERANT).post(
            '/api/manage/variants/',
            {'product': product().id, 'size': '42', 'color': color().id, 'stock': -1},
            format='json',
        )

        assert response.status_code == 400
        assert 'stock' in response.data
