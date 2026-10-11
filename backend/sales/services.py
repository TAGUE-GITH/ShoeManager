"""US-17 : vente en boutique. Utilisee par la caisse et quand une reservation est honoree (US-16)."""

from django.db import transaction
from django.db.models import F
from django.utils.translation import gettext as _
from rest_framework.exceptions import ValidationError

from accounts.models import User
from catalog.models import Variant, format_size
from catalog.stock import check_available, lock_variants
from reservations.models import ReservationStatus

from .models import Sale, SaleItem


@transaction.atomic
def create_sale(seller, lines, payment_method, customer=None, reservation=None):
    """
    Enregistre une vente : lines = [(declinaison, quantite)]. Le stock physique diminue tout de suite,
    et le client eventuel gagne ses points de fidelite (R13).
    """
    if not lines:
        raise ValidationError({'items': _('Ajoutez au moins une paire.')})

    lock_variants([variant.id for variant, _quantity in lines])
    if reservation is not None:
        # La paire reservee est liberee juste avant d'etre vendue : elle redevient disponible pour cette vente
        reservation.status = ReservationStatus.HONOREE
        reservation.save(update_fields=['status'])
    check_available(lines)

    variants = {
        v.id: v for v in Variant.objects.select_related('product', 'color').filter(id__in=[v.id for v, _q in lines])
    }
    total = sum(variants[variant.id].product.price * quantity for variant, quantity in lines)
    sale = Sale.objects.create(
        seller=seller, customer=customer, reservation=reservation, payment_method=payment_method, total=total
    )
    for variant, quantity in lines:
        current = variants[variant.id]
        SaleItem.objects.create(
            sale=sale,
            variant=current,
            product_name=current.product.name,
            size=format_size(current.size),
            color=current.color.name,
            quantity=quantity,
            unit_price=current.product.price,
        )
        Variant.objects.filter(id=current.id).update(stock=F('stock') - quantity)
    if customer is not None:
        User.objects.filter(pk=customer.pk).update(loyalty_points=F('loyalty_points') + int(total // 1000))
    return sale
