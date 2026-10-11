"""
Regles metier des commandes (cahier des charges, section 5) :
R2/R3 stock disponible verifie dans une transaction, R5 transitions de statut, R6 stock physique,
R7 prix figes, R8 frais de livraison, R13 points de fidelite.
"""

from django.db import transaction
from django.db.models import F
from django.utils.translation import gettext as _
from rest_framework.exceptions import ValidationError

from accounts.models import User
from cart.models import Cart
from catalog.models import Variant, format_size
from catalog.stock import check_available, lock_variants

from .delivery import BY_KEY, MIN_PAIRS_ABROAD, delivery_fee
from .emails import send_order_email
from .models import DeliveryMode, DeliveryZone, Order, OrderItem, OrderStatus, PaymentMethod

# R5 : etapes autorisees depuis chaque statut
TRANSITIONS = {
    OrderStatus.EN_ATTENTE: [OrderStatus.CONFIRMEE, OrderStatus.ANNULEE],
    OrderStatus.CONFIRMEE: [OrderStatus.EN_PREPARATION, OrderStatus.ANNULEE],
    OrderStatus.EN_PREPARATION: [OrderStatus.EXPEDIEE, OrderStatus.PRETE, OrderStatus.ANNULEE],
    OrderStatus.EXPEDIEE: [OrderStatus.LIVREE],
    OrderStatus.PRETE: [OrderStatus.LIVREE],
    OrderStatus.LIVREE: [],
    OrderStatus.ANNULEE: [],
}

# Le client peut annuler tant que la preparation n'a pas commence
CUSTOMER_CANCELLABLE = [OrderStatus.EN_ATTENTE, OrderStatus.CONFIRMEE]


def next_statuses(order):
    """Etapes possibles pour cette commande (une livraison est expediee, un retrait est mis a disposition)."""
    allowed = TRANSITIONS[order.status]
    excluded = OrderStatus.PRETE if order.delivery_mode == DeliveryMode.LIVRAISON else OrderStatus.EXPEDIEE
    return [status for status in allowed if status != excluded]


@transaction.atomic
def place_order(user, *, delivery_mode, payment_method, phone, delivery_city='', delivery_address=''):
    """US-10 : transforme le panier en commande."""
    cart = Cart.objects.filter(user=user).first()
    items = list(cart.items.select_related('variant__product', 'variant__color')) if cart else []
    if not items:
        raise ValidationError({'detail': _('Votre panier est vide.')})

    lock_variants([item.variant_id for item in items])
    check_available(
        [(item.variant, item.quantity) for item in items],
        _('Stock insuffisant pour : %(names)s. Modifiez votre panier.'),
    )

    subtotal = sum(item.variant.product.price * item.quantity for item in items)
    pairs = sum(item.quantity for item in items)
    city, zone, fee = '', '', 0
    if delivery_mode == DeliveryMode.LIVRAISON:
        city, zone = BY_KEY[delivery_city]
        if zone == DeliveryZone.ETRANGER and pairs < MIN_PAIRS_ABROAD:
            raise ValidationError(
                {
                    'delivery_city': _('Livraison à l’étranger à partir de %(count)s paires.')
                    % {'count': MIN_PAIRS_ABROAD}
                }
            )
        fee = delivery_fee(zone, subtotal, pairs)
    order = Order.objects.create(
        customer=user,
        delivery_mode=delivery_mode,
        delivery_zone=zone,
        delivery_city=city,
        delivery_address=delivery_address if delivery_mode == DeliveryMode.LIVRAISON else '',
        phone=phone,
        payment_method=payment_method,
        # Paiement Mobile Money simule : considere comme recu immediatement
        is_paid=payment_method == PaymentMethod.MOBILE_MONEY,
        subtotal=subtotal,
        delivery_fee=fee,
        total=subtotal + fee,
    )
    OrderItem.objects.bulk_create(
        OrderItem(
            order=order,
            variant=item.variant,
            product_name=item.variant.product.name,
            size=format_size(item.variant.size),
            color=item.variant.color.name,
            quantity=item.quantity,
            unit_price=item.variant.product.price,
        )
        for item in items
    )
    cart.items.all().delete()
    transaction.on_commit(lambda: send_order_email(order.pk, 'created'))
    return order


def _move_stock(order, direction):
    """Retire (-1) ou remet (+1) les paires de la commande dans le stock physique (R6)."""
    items = list(order.items.all())
    lock_variants([item.variant_id for item in items])
    for item in items:
        if direction < 0 and Variant.objects.get(id=item.variant_id).stock < item.quantity:
            raise ValidationError(
                {'detail': _('Stock physique insuffisant pour %(name)s.') % {'name': item.product_name}}
            )
        Variant.objects.filter(id=item.variant_id).update(stock=F('stock') + direction * item.quantity)


@transaction.atomic
def change_status(order, new_status):
    """US-12 : fait avancer une commande d'une etape (ou l'annule) et applique les effets associes."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if new_status not in next_statuses(order):
        raise ValidationError(
            {
                'status': _('Passage de « %(old)s » à « %(new)s » impossible.')
                % {'old': order.get_status_display(), 'new': OrderStatus(new_status).label}
            }
        )

    previous = order.status
    if new_status == OrderStatus.EN_PREPARATION:
        _move_stock(order, -1)
    elif new_status == OrderStatus.ANNULEE and previous == OrderStatus.EN_PREPARATION:
        _move_stock(order, +1)
    elif new_status == OrderStatus.LIVREE:
        order.is_paid = True
        # R13 : 1 point par tranche de 1 000 FCFA d'articles (hors livraison)
        User.objects.filter(pk=order.customer_id).update(
            loyalty_points=F('loyalty_points') + int(order.subtotal // 1000)
        )

    order.status = new_status
    order.save(update_fields=['status', 'is_paid', 'updated_at'])
    transaction.on_commit(lambda: send_order_email(order.pk, 'status'))
    return order


def cancel_by_customer(order):
    """US-13 : annulation par le client, possible seulement avant la preparation."""
    if order.status not in CUSTOMER_CANCELLABLE:
        raise ValidationError({'detail': _('Cette commande est déjà en préparation : elle ne peut plus être annulée.')})
    return change_status(order, OrderStatus.ANNULEE)


@transaction.atomic
def add_to_order(order, variant, quantity):
    """
    Le client ajoute des paires a sa commande tant qu'elle n'est pas en preparation (le stock n'a pas encore
    quitte la boutique). Prix actuel du produit, frais de livraison recalcules sur le nouveau contenu.
    """
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status not in CUSTOMER_CANCELLABLE:
        raise ValidationError(
            {'detail': _('Cette commande est déjà en préparation : passez une nouvelle commande pour ces paires.')}
        )
    if not variant.product.is_published:
        raise ValidationError({'variant': _('Ce produit n’est pas disponible.')})
    lock_variants([variant.id])
    check_available([(variant, quantity)])

    price = variant.product.price
    item = order.items.filter(variant=variant, unit_price=price).first()
    if item:
        item.quantity += quantity
        item.save(update_fields=['quantity'])
    else:
        OrderItem.objects.create(
            order=order,
            variant=variant,
            product_name=variant.product.name,
            size=format_size(variant.size),
            color=variant.color.name,
            quantity=quantity,
            unit_price=price,
        )

    items = list(order.items.all())
    order.subtotal = sum(line.unit_price * line.quantity for line in items)
    if order.delivery_mode == DeliveryMode.LIVRAISON:
        order.delivery_fee = delivery_fee(order.delivery_zone, order.subtotal, sum(line.quantity for line in items))
    order.total = order.subtotal + order.delivery_fee
    order.save(update_fields=['subtotal', 'delivery_fee', 'total', 'updated_at'])
    return order


def reorder(order):
    """
    « Commander a nouveau » : remet les memes paires dans le panier, dans la limite du stock disponible.
    Renvoie le nombre de paires ajoutees et les paires qui ne sont plus disponibles.
    """
    cart, _created = Cart.objects.get_or_create(user=order.customer)
    added, unavailable = 0, []
    for line in order.items.select_related('variant__product'):
        variant = line.variant
        in_cart = cart.items.filter(variant=variant).first()
        free = Variant.objects.with_available().get(id=variant.id).available - (in_cart.quantity if in_cart else 0)
        quantity = min(line.quantity, free) if variant.product.is_published else 0
        if quantity <= 0:
            unavailable.append(f'{line.product_name} ({line.size})')
            continue
        if in_cart:
            in_cart.quantity += quantity
            in_cart.save(update_fields=['quantity'])
        else:
            cart.items.create(variant=variant, quantity=quantity)
        added += quantity
    cart.save(update_fields=['updated_at'])
    return {'added': added, 'unavailable': unavailable}
