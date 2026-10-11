"""US-06 : photos des produits (stockees en base de donnees, redimensionnees et compressees)."""

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from accounts.models import Role
from catalog.models import ProductImage
from catalog.tests.factories import product


def photo(width=2400, height=1600, fmt='JPEG', name='chaussure.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (width, height), (200, 80, 40)).save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f'image/{fmt.lower()}')


def upload_url(item):
    return f'/api/manage/products/{item.id}/images/'


@pytest.mark.django_db
class TestProductImages:
    def test_the_manager_adds_a_photo(self, client_for):
        item = product()

        response = client_for(Role.GERANT).post(upload_url(item), {'image': photo()}, format='multipart')

        assert response.status_code == 201, response.data
        stored = ProductImage.objects.get()
        assert stored.content_type == 'image/webp'
        # Redimensionnee : 1200 px maximum, proportions conservees
        assert Image.open(BytesIO(bytes(stored.data))).size == (1200, 800)
        assert response.data['url'].endswith(f'/api/images/{stored.id}/')

    def test_the_photo_is_served_publicly_with_a_long_cache(self, api, client_for):
        item = product()
        image_id = client_for(Role.GERANT).post(upload_url(item), {'image': photo()}, format='multipart').data['id']

        response = api.get(f'/api/images/{image_id}/')

        assert response.status_code == 200
        assert response['Content-Type'] == 'image/webp'
        assert 'max-age' in response['Cache-Control']

    def test_the_catalog_shows_the_first_photo(self, api, client_for):
        item = product(name='Air Force 1')
        client_for(Role.GERANT).post(upload_url(item), {'image': photo()}, format='multipart')

        card = api.get('/api/products/').data['results'][0]
        detail = api.get(f'/api/products/{item.slug}/').data

        assert card['image'].endswith(f'/api/images/{ProductImage.objects.get().id}/')
        assert detail['images'][0]['url'] == card['image']

    def test_a_file_that_is_not_an_image_is_refused(self, client_for):
        fake = SimpleUploadedFile('virus.jpg', b'pas une image', content_type='image/jpeg')

        response = client_for(Role.GERANT).post(upload_url(product()), {'image': fake}, format='multipart')

        assert response.status_code == 400
        assert ProductImage.objects.count() == 0

    def test_a_too_large_file_is_refused(self, client_for, settings):
        settings.MAX_IMAGE_UPLOAD_BYTES = 1000

        response = client_for(Role.GERANT).post(upload_url(product()), {'image': photo()}, format='multipart')

        assert response.status_code == 400

    def test_only_the_manager_can_add_photos(self, client_for):
        response = client_for(Role.VENDEUR).post(upload_url(product()), {'image': photo()}, format='multipart')

        assert response.status_code == 403

    def test_delete_a_photo(self, client_for):
        manager = client_for(Role.GERANT)
        image_id = manager.post(upload_url(product()), {'image': photo()}, format='multipart').data['id']

        assert manager.delete(f'/api/manage/images/{image_id}/').status_code == 204
        assert ProductImage.objects.count() == 0
