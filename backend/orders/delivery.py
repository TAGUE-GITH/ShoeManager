"""
Regle R8 : frais de livraison selon la destination et le nombre de paires (retrait en boutique gratuit).

- Douala : forfait de 1 000 FCFA ;
- autres villes du Cameroun : 10 % du montant des chaussures (10 000 FCFA -> 1 000 FCFA) ;
- etranger : 20 % du montant, a partir de 5 paires ;
- a partir de 10 paires : 10 % de reduction sur la livraison, quelle que soit la destination.
"""

from decimal import ROUND_HALF_UP, Decimal

from .models import DeliveryZone

DOUALA_FEE = 1000
RATES = {DeliveryZone.AUTRE_VILLE: 10, DeliveryZone.ETRANGER: 20}
MIN_PAIRS_ABROAD = 5
BULK_PAIRS = 10
BULK_DISCOUNT = 10

# Destinations proposees au client (cle envoyee par l'API, nom affiche, zone tarifaire)
DESTINATIONS = [
    ('DOUALA', 'Douala', DeliveryZone.DOUALA),
    ('YAOUNDE', 'Yaoundé', DeliveryZone.AUTRE_VILLE),
    ('BAFOUSSAM', 'Bafoussam', DeliveryZone.AUTRE_VILLE),
    ('BAFANG', 'Bafang', DeliveryZone.AUTRE_VILLE),
    ('BAMENDA', 'Bamenda', DeliveryZone.AUTRE_VILLE),
    ('BERTOUA', 'Bertoua', DeliveryZone.AUTRE_VILLE),
    ('BUEA', 'Buea', DeliveryZone.AUTRE_VILLE),
    ('DSCHANG', 'Dschang', DeliveryZone.AUTRE_VILLE),
    ('EDEA', 'Édéa', DeliveryZone.AUTRE_VILLE),
    ('LIMBE', 'Limbé', DeliveryZone.AUTRE_VILLE),
    ('LOUM', 'Loum', DeliveryZone.AUTRE_VILLE),
    ('MBOUDA', 'Mbouda', DeliveryZone.AUTRE_VILLE),
    ('NKONGSAMBA', 'Nkongsamba', DeliveryZone.AUTRE_VILLE),
    ('NORD', 'Nord (Garoua)', DeliveryZone.AUTRE_VILLE),
    ('NOUN', 'Noun (Foumban)', DeliveryZone.AUTRE_VILLE),
    ('SOUZA', 'Souza', DeliveryZone.AUTRE_VILLE),
    ('GABON', 'Gabon', DeliveryZone.ETRANGER),
    ('GUINEE', 'Guinée', DeliveryZone.ETRANGER),
    ('TCHAD', 'Tchad', DeliveryZone.ETRANGER),
]
BY_KEY = {key: (label, zone) for key, label, zone in DESTINATIONS}


def delivery_fee(zone, subtotal, pairs):
    fee = Decimal(DOUALA_FEE) if zone == DeliveryZone.DOUALA else Decimal(subtotal) * RATES[zone] / 100
    if pairs >= BULK_PAIRS:
        fee = fee * (100 - BULK_DISCOUNT) / 100
    return fee.quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def rules():
    return {
        'douala_fee': DOUALA_FEE,
        'rates': {str(zone): rate for zone, rate in RATES.items()},
        'min_pairs_abroad': MIN_PAIRS_ABROAD,
        'bulk_pairs': BULK_PAIRS,
        'bulk_discount': BULK_DISCOUNT,
    }
