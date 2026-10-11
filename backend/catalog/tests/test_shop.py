"""US-07 (parcourir le catalogue) et US-08 (fiche produit) : routes publiques de la boutique."""

import pytest

from catalog.tests.factories import brand, category, color, product, variant

PRODUCTS_URL = '/api/products/'


def names(response):
    return sorted(item['name'] for item in response.data['results'])


@pytest.mark.django_db
class TestCatalogList:
    def test_is_public_and_lists_only_published_products(self, api):
        product(name='Visible')
        product(name='Brouillon', published=False)

        response = api.get(PRODUCTS_URL)

        assert response.status_code == 200
        assert names(response) == ['Visible']

    def test_category_filter_includes_subcategories(self, api):
        men = category('Hommes')
        sneakers = category('Baskets', parent=men)
        women = category('Femmes')
        product(name='Air Max', category_=sneakers)
        product(name='Mocassin', category_=men)
        product(name='Escarpin', category_=women)

        response = api.get(PRODUCTS_URL, {'category': men.slug})

        assert names(response) == ['Air Max', 'Mocassin']

    def test_filter_by_available_size_and_color(self, api):
        white, black = color('Blanc'), color('Noir', '#000000')
        a = product(name='Basket A')
        variant(a, size=42, color_=white)
        b = product(name='Basket B')
        variant(b, size=42, color_=black)
        c = product(name='Basket C')
        variant(c, size=42, color_=white, stock=0)

        response = api.get(PRODUCTS_URL, {'size': '42', 'color': white.id})

        # C a bien la pointure et la couleur, mais plus aucune paire disponible
        assert names(response) == ['Basket A']

    def test_filter_by_brand_and_price_range(self, api):
        product(name='Nike pas chère', brand_=brand('Nike'), price=20000)
        product(name='Nike chère', brand_=brand('Nike'), price=90000)
        product(name='Adidas', brand_=brand('Adidas'), price=30000)

        response = api.get(PRODUCTS_URL, {'brand': brand('Nike').slug, 'min_price': 15000, 'max_price': 50000})

        assert names(response) == ['Nike pas chère']

    def test_search_by_name_or_brand(self, api):
        product(name='Stan Smith', brand_=brand('Adidas'))
        product(name='Air Force 1', brand_=brand('Nike'))

        assert names(api.get(PRODUCTS_URL, {'search': 'stan'})) == ['Stan Smith']
        assert names(api.get(PRODUCTS_URL, {'search': 'nike'})) == ['Air Force 1']

    def test_results_are_paginated_by_20(self, api):
        shared_category, shared_brand = category(), brand()
        for index in range(25):
            product(name=f'Modèle {index}', category_=shared_category, brand_=shared_brand)

        response = api.get(PRODUCTS_URL)

        assert response.data['count'] == 25
        assert len(response.data['results']) == 20

    def test_list_item_shows_summary_fields(self, api):
        item = product(name='Air Force 1', price=45000)
        variant(item, size=42)
        variant(item, size=43, stock=0)

        result = api.get(PRODUCTS_URL).data['results'][0]

        assert result['slug'] == 'air-force-1'
        assert result['brand'] == 'Nike'
        assert result['price'] == '45000'
        assert result['available_sizes'] == ['42']
        assert result['in_stock'] is True


@pytest.mark.django_db
class TestProductDetail:
    def test_shows_variants_with_their_availability(self, api):
        item = product(name='Air Force 1')
        variant(item, size=42, color_=color('Blanc'), stock=3)
        variant(item, size='37.5', color_=color('Noir', '#000000'), stock=0)

        response = api.get(f'{PRODUCTS_URL}{item.slug}/')

        assert response.status_code == 200
        variants = {(v['size'], v['color']['name']): v for v in response.data['variants']}
        assert variants[('42', 'Blanc')]['available'] == 3
        # Pointure epuisee : affichee mais non disponible
        assert variants[('37.5', 'Noir')]['available'] == 0

    def test_unpublished_product_is_not_found(self, api):
        hidden = product(name='Secret', published=False)

        assert api.get(f'{PRODUCTS_URL}{hidden.slug}/').status_code == 404


@pytest.mark.django_db
class TestFilterOptions:
    def test_categories_are_returned_as_a_tree(self, api):
        men = category('Hommes')
        category('Baskets', parent=men)
        category('Ville', parent=men)

        response = api.get('/api/categories/')

        assert response.status_code == 200
        assert [c['name'] for c in response.data] == ['Hommes']
        assert [c['name'] for c in response.data[0]['children']] == ['Baskets', 'Ville']

    def test_brands_and_colors_are_public(self, api):
        brand('Puma')
        color('Rouge', '#dc2626')

        assert api.get('/api/brands/').data[0]['name'] == 'Puma'
        assert api.get('/api/colors/').data[0]['hex_code'] == '#dc2626'
