"""Preparation des photos envoyees par le gerant : verification, redimensionnement et compression en WebP."""

from io import BytesIO

from django.conf import settings
from django.utils.translation import gettext as _
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

MAX_SIDE = 1200


def prepare_image(uploaded):
    """Renvoie les octets WebP d'une photo valide (1200 px maximum), ou une erreur 400."""
    if uploaded.size > getattr(settings, 'MAX_IMAGE_UPLOAD_BYTES', 8 * 1024 * 1024):
        raise ValidationError({'image': _('Photo trop lourde (8 Mo maximum).')})
    try:
        image = Image.open(uploaded)
        image.verify()  # rejette les fichiers qui ne sont pas de vraies images
        uploaded.seek(0)
        image = ImageOps.exif_transpose(Image.open(uploaded))  # photo de telephone : bonne orientation
    except (UnidentifiedImageError, OSError, SyntaxError) as error:
        raise ValidationError({'image': _('Ce fichier n’est pas une image valide (JPEG, PNG ou WebP).')}) from error

    image.thumbnail((MAX_SIDE, MAX_SIDE))
    if image.mode not in ('RGB', 'RGBA'):
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
    output = BytesIO()
    image.save(output, format='WEBP', quality=82, method=6)
    return output.getvalue()
