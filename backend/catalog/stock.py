"""
Outils de stock partages par les commandes, les reservations et la caisse (regles R2 et R3).
A utiliser dans une transaction (transaction.atomic).
"""

from django.utils.translation import gettext as _
from rest_framework.exceptions import ValidationError

from .models import Variant, format_size


def lock_variants(variant_ids):
    """
    Verrouille les declinaisons jusqu'a la fin de la transaction (SELECT ... FOR UPDATE), toujours dans
    le meme ordre pour eviter les interblocages : deux ventes simultanees ne peuvent pas prendre la meme paire.
    """
    return list(
        Variant.objects.select_for_update().filter(id__in=variant_ids).order_by('id').values_list('id', flat=True)
    )


def check_available(lines, message=None):
    """
    Verifie que chaque (declinaison, quantite) est disponible ; sinon erreur 400 qui nomme les paires manquantes.
    Les declinaisons doivent deja etre verrouillees.
    """
    ids = [variant.id for variant, _quantity in lines]
    available = dict(Variant.objects.with_available().filter(id__in=ids).values_list('id', 'available'))
    missing = [variant for variant, quantity in lines if quantity > available[variant.id]]
    if missing:
        names = ', '.join(f'{variant.product.name} ({format_size(variant.size)})' for variant in missing)
        raise ValidationError({'detail': (message or _('Stock insuffisant pour : %(names)s.')) % {'names': names}})
