"""Les modeles de demonstration recoivent une vraie photo, stockee en WebP, une seule fois."""

from io import BytesIO

import pytest
from PIL import Image

from catalog.demo import seed
from catalog.demo_photos import PHOTOS, add_demo_photos
from catalog.models import Product, ProductImage


def fake_jpeg(_photo_id):
    output = BytesIO()
    Image.new('RGB', (1600, 1600), '#c2410c').save(output, format='JPEG')
    return output.getvalue()


@pytest.mark.django_db
def test_each_demo_shoe_gets_a_real_photo_once(settings, api):
    seed()
    assert ProductImage.objects.count() == 0  # pas de telechargement pendant les tests

    settings.DEMO_PHOTOS = True
    assert add_demo_photos(fetch=fake_jpeg) == len(PHOTOS) == Product.objects.count()
    assert add_demo_photos(fetch=fake_jpeg) == 0  # deja faites : rien n'est retelecharge

    photo = ProductImage.objects.first()
    assert photo.content_type == 'image/webp'
    assert max(Image.open(BytesIO(bytes(photo.data))).size) == 1200
    listed = api.get('/api/products/').json()['results']
    assert all(product['image'] for product in listed)


@pytest.mark.django_db
def test_a_missing_connection_keeps_the_illustration(settings):
    seed()
    settings.DEMO_PHOTOS = True

    def offline(_photo_id):
        raise OSError('pas de connexion')

    assert add_demo_photos(fetch=offline) == 0
    assert ProductImage.objects.count() == 0
