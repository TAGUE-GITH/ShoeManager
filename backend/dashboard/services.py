"""
US-19 et US-20 : chiffres du tableau de bord du gerant.

Chiffre d'affaires en boutique = ventes de la caisse ; en ligne = commandes remises au client (statut LIVREE,
comptees au jour de la remise). Les commandes annulees ou pas encore remises ne comptent pas.
"""

from collections import defaultdict
from datetime import datetime, time, timedelta

from django.db.models import F, Sum
from django.utils import timezone

from catalog.models import Variant, format_size
from orders.models import PENDING_STATUSES, Order, OrderItem, OrderStatus
from reservations.models import Reservation
from sales.models import Sale, SaleItem

PERIODS = {'today': 1, 'week': 7, 'month': 30}


def _since(days):
    """Debut du jour, il y a (days - 1) jours, dans le fuseau de la boutique (Douala)."""
    start = timezone.localdate() - timedelta(days=days - 1)
    return timezone.make_aware(datetime.combine(start, time.min))


def _delivered_orders():
    return Order.objects.filter(status=OrderStatus.LIVREE)


def revenue():
    result = {}
    for name, days in PERIODS.items():
        since = _since(days)
        store = Sale.objects.filter(created_at__gte=since).aggregate(total=Sum('total'))['total'] or 0
        online = _delivered_orders().filter(updated_at__gte=since).aggregate(total=Sum('total'))['total'] or 0
        result[name] = {'store': str(store), 'online': str(online), 'total': str(store + online)}
    return result


def _sold_items(since):
    """Lignes vendues (caisse + commandes remises) depuis une date : (produit, pointure, quantite, montant)."""
    store = SaleItem.objects.filter(sale__created_at__gte=since)
    online = OrderItem.objects.filter(order__status=OrderStatus.LIVREE, order__updated_at__gte=since)
    for queryset in (store, online):
        yield from queryset.values_list('product_name', 'size', 'quantity', 'unit_price')


def best_sellers_and_sizes(limit=5):
    products = defaultdict(lambda: {'quantity': 0, 'revenue': 0})
    sizes = defaultdict(int)
    for name, size, quantity, unit_price in _sold_items(_since(PERIODS['month'])):
        products[name]['quantity'] += quantity
        products[name]['revenue'] += quantity * unit_price
        sizes[size] += quantity
    best = sorted(products.items(), key=lambda item: (-item[1]['quantity'], item[0]))[:limit]
    return (
        [{'name': name, 'quantity': row['quantity'], 'revenue': str(row['revenue'])} for name, row in best],
        [{'size': size, 'quantity': qty} for size, qty in sorted(sizes.items(), key=lambda s: (-s[1], float(s[0])))],
    )


def daily_revenue(days=14):
    """Chiffre d'affaires jour par jour (boutique et en ligne) sur les derniers jours, y compris les jours a zero."""
    since = _since(days)
    today = timezone.localdate()
    series = {today - timedelta(days=offset): {'store': 0, 'online': 0} for offset in range(days)}
    for created_at, total in Sale.objects.filter(created_at__gte=since).values_list('created_at', 'total'):
        series[timezone.localdate(created_at)]['store'] += total
    for updated_at, total in _delivered_orders().filter(updated_at__gte=since).values_list('updated_at', 'total'):
        series[timezone.localdate(updated_at)]['online'] += total
    return [
        {'date': day.isoformat(), 'store': str(values['store']), 'online': str(values['online'])}
        for day, values in sorted(series.items())
    ]


def low_stock_variants():
    """US-19 : declinaisons dont le stock disponible est sous le seuil du produit (les plus urgentes d'abord)."""
    return (
        Variant.objects.with_available()
        .filter(product__is_published=True, available__lte=F('product__low_stock_threshold'))
        .select_related('product', 'color')
        .order_by('available', 'product__name', 'size')
    )


def stock_alert_rows():
    return [
        {
            'variant': variant.id,
            'sku': variant.sku,
            'product': variant.product.name,
            'product_id': variant.product_id,
            'size': format_size(variant.size),
            'color': variant.color.name,
            'color_hex': variant.color.hex_code,
            'stock': variant.stock,
            'available': variant.available,
            'threshold': variant.product.low_stock_threshold,
        }
        for variant in low_stock_variants()
    ]


def dashboard():
    best_sellers, sizes = best_sellers_and_sizes()
    return {
        'revenue': revenue(),
        'daily': daily_revenue(),
        'best_sellers': best_sellers,
        'sizes': sizes,
        'to_handle': {
            'orders': Order.objects.filter(status__in=PENDING_STATUSES).count(),
            'reservations': Reservation.objects.holding().count(),
            'low_stock': low_stock_variants().count(),
        },
    }
