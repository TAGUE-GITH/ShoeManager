"""
Photos des chaussures de demonstration : photos libres de droits (licence Unsplash, usage commercial gratuit),
telechargees une seule fois puis stockees en base au format WebP, comme les photos envoyees par le gerant.
"""

import logging
from io import BytesIO
from urllib.request import Request, urlopen

from django.conf import settings
from PIL import Image

from catalog.images import MAX_SIDE
from catalog.models import Product, ProductImage

log = logging.getLogger(__name__)

# Nom du modele -> identifiant de la photo sur Unsplash
PHOTOS = {
    'Air Force 1': '1597350584914-55bb62285896',
    'Stan Smith': '1544441892-794166f1e3be',
    'Suede Classic': '1680204101400-aeac783c9d87',
    'Derby Tilden': '1614252235316-8c857d38b5f4',
    'Mocassin Comfit': '1616406432452-07bc5938759d',
    'Sandale Explorer': '1585120824848-8a5cd41493d2',
    'Air Max 90': '1620138546344-7b2c38516edf',
    'Chuck Taylor All Star': '1565379793984-e65b51b33b37',
    'Escarpin Elena': '1596702874230-b5706dfb5bc7',
    'Sandale à talon Laina': '1770757685173-94df47a52b68',
    'Sandale Plage Kribi': '1619510331283-a46c425e48bb',
    'Superstar Kids': '1605382165091-443eff32caf5',
    'Revolution 7': '1624958797025-b119e2fa2b53',
    'Chaussure scolaire Junior': '1653868250317-144a0c4f5884',
    'Babies Daisy': '1678192569393-c7aff066e5bd',
}


def photo_url(photo_id):
    return f'https://images.unsplash.com/photo-{photo_id}?w={MAX_SIDE}&h={MAX_SIDE}&fit=crop&q=80&fm=jpg'


def to_webp(data):
    """Octets d'une photo -> WebP carre, 1200 px maximum (meme format que les photos du gerant)."""
    image = Image.open(BytesIO(data)).convert('RGB')
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    output = BytesIO()
    image.save(output, format='WEBP', quality=82, method=6)
    return output.getvalue()


def download(photo_id):
    request = Request(photo_url(photo_id), headers={'User-Agent': 'ShoeManager'})
    with urlopen(request, timeout=20) as response:  # noqa: S310 (adresse fixe d'Unsplash)
        return response.read()


def add_demo_photos(fetch=download):
    """Ajoute sa photo a chaque modele de demonstration qui n'en a pas ; renvoie le nombre de photos ajoutees."""
    if not getattr(settings, 'DEMO_PHOTOS', True):
        return 0
    added = 0
    for product in Product.objects.filter(name__in=PHOTOS, images__isnull=True):
        try:
            data = to_webp(fetch(PHOTOS[product.name]))
        except Exception as error:  # noqa: BLE001 (sans connexion, le produit garde son illustration)
            log.warning('Photo de démonstration indisponible pour %s : %s', product.name, error)
            continue
        ProductImage.objects.create(product=product, data=data, content_type='image/webp', position=0)
        added += 1
    return added
