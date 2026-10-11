"""
Catalogue et comptes de demonstration (commande seed_demo et bouton « Essayer la demo »).

Cree les categories, marques, couleurs, une quinzaine de modeles avec leurs pointures, et un compte
par role (adresses en .example : aucun email reel). Peut etre relance sans doublon.
"""

import random
from decimal import Decimal

from django.db import transaction

from accounts.models import Role, User
from catalog.models import Brand, Category, Color, Product, Variant

DEMO_PASSWORD = 'demo-franckshoese'

COLORS = {
    'Blanc': '#f8fafc',
    'Noir': '#111827',
    'Marron': '#7c4a21',
    'Beige': '#d6c3a5',
    'Bleu marine': '#1e3a5f',
    'Rouge': '#b91c1c',
    'Rose': '#f472b6',
    'Gris': '#9ca3af',
}

# Ordre des rayons dans la boutique
POSITIONS = {'Hommes': 1, 'Femmes': 2, 'Enfants': 3}

SIZES = {
    'Hommes': [39, 40, 41, 42, 43, 44, 45],
    'Femmes': [36, 37, 38, 39, 40, 41],
    'Enfants': [28, 29, 30, 31, 32, 33, 34, 35],
}

# (categorie parente, sous-categorie, marque, nom, prix XAF, couleurs, description)
PRODUCTS = [
    ('Hommes', 'Baskets', 'Nike', 'Air Force 1', 65000, ['Blanc', 'Noir'], 'La basket montante en cuir, intemporelle.'),
    (
        'Hommes',
        'Baskets',
        'Adidas',
        'Stan Smith',
        55000,
        ['Blanc'],
        'Cuir lisse et talon vert : un classique du tennis.',
    ),
    (
        'Hommes',
        'Baskets',
        'Puma',
        'Suede Classic',
        42000,
        ['Bleu marine', 'Rouge'],
        'Daim souple et semelle en caoutchouc.',
    ),
    (
        'Hommes',
        'Ville',
        'Clarks',
        'Derby Tilden',
        58000,
        ['Noir', 'Marron'],
        'Derby en cuir pour le bureau et les cérémonies.',
    ),
    (
        'Hommes',
        'Ville',
        'Bata',
        'Mocassin Comfit',
        32000,
        ['Marron', 'Noir'],
        'Mocassin léger avec semelle amortissante.',
    ),
    ('Hommes', 'Sandales', 'Bata', 'Sandale Explorer', 15000, ['Marron'], 'Sandale robuste pour la saison chaude.'),
    (
        'Femmes',
        'Baskets',
        'Nike',
        'Air Max 90',
        78000,
        ['Blanc', 'Rose'],
        'Bulle d’air visible et confort toute la journée.',
    ),
    ('Femmes', 'Baskets', 'Converse', 'Chuck Taylor All Star', 38000, ['Noir', 'Blanc'], 'La toile iconique.'),
    ('Femmes', 'Talons', 'Bata', 'Escarpin Elena', 29000, ['Noir', 'Rouge'], 'Talon de 7 cm, bout pointu.'),
    (
        'Femmes',
        'Talons',
        'Clarks',
        'Sandale à talon Laina',
        52000,
        ['Beige', 'Noir'],
        'Talon carré stable et bride réglable.',
    ),
    ('Femmes', 'Sandales', 'Bata', 'Sandale Plage Kribi', 12000, ['Beige', 'Rose'], 'Légère, idéale pour la plage.'),
    ('Enfants', 'Baskets', 'Adidas', 'Superstar Kids', 30000, ['Blanc'], 'Bout coquillage et scratch facile à fermer.'),
    (
        'Enfants',
        'Baskets',
        'Nike',
        'Revolution 7',
        27000,
        ['Bleu marine', 'Gris'],
        'Basket de course légère pour la récréation.',
    ),
    (
        'Enfants',
        'Écoliers',
        'Bata',
        'Chaussure scolaire Junior',
        18000,
        ['Noir'],
        'Cuir résistant pour toute l’année scolaire.',
    ),
    ('Enfants', 'Écoliers', 'Clarks', 'Babies Daisy', 24000, ['Noir', 'Bleu marine'], 'Babies à bride pour l’école.'),
]

ACCOUNTS = [
    (Role.GERANT, 'gerant', 'Franck', 'Tague'),
    (Role.VENDEUR, 'vendeur', 'Paul', 'Etoga'),
    (Role.CLIENT, 'client', 'Awa', 'Ngono'),
]


def demo_email(role):
    login = {Role.GERANT: 'gerant', Role.VENDEUR: 'vendeur', Role.CLIENT: 'client'}[role]
    return f'{login}@franckshoese.example'


@transaction.atomic
def seed():
    # Stocks reproductibles d'une execution a l'autre
    rng = random.Random(2026)
    colors = {
        name: Color.objects.get_or_create(name=name, defaults={'hex_code': hex_code})[0]
        for name, hex_code in COLORS.items()
    }

    for parent_name, child_name, brand_name, name, price, color_names, description in PRODUCTS:
        parent, _ = Category.objects.update_or_create(
            name=parent_name, parent=None, defaults={'position': POSITIONS[parent_name]}
        )
        child, _ = Category.objects.get_or_create(name=child_name, parent=parent)
        brand, _ = Brand.objects.get_or_create(name=brand_name)
        product, created = Product.objects.get_or_create(
            name=name,
            brand=brand,
            defaults={'category': child, 'price': Decimal(price), 'description': description},
        )
        if not created:
            continue
        for color_name in color_names:
            for size in SIZES[parent_name]:
                # Environ une pointure sur six epuisee, pour montrer les ruptures
                stock = 0 if rng.random() < 0.17 else rng.randint(1, 9)
                Variant.objects.create(product=product, size=Decimal(size), color=colors[color_name], stock=stock)

    for role, login, first_name, last_name in ACCOUNTS:
        email = f'{login}@franckshoese.example'
        if not User.objects.filter(email=email).exists():
            User.objects.create_user(
                email=email, password=DEMO_PASSWORD, role=role, first_name=first_name, last_name=last_name
            )
