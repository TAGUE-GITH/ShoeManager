"""Creation rapide de donnees de catalogue pour les tests."""

from decimal import Decimal

from catalog.models import Brand, Category, Color, Product, Variant


def category(name='Baskets', parent=None):
    return Category.objects.create(name=name, parent=parent)


def brand(name='Nike'):
    return Brand.objects.get_or_create(name=name)[0]


def color(name='Blanc', hex_code='#ffffff'):
    return Color.objects.get_or_create(name=name, defaults={'hex_code': hex_code})[0]


def product(name='Air Force 1', category_=None, brand_=None, price=45000, published=True, **fields):
    return Product.objects.create(
        name=name,
        category=category_ or category(),
        brand=brand_ or brand(),
        price=Decimal(price),
        is_published=published,
        description=fields.pop('description', 'Basket iconique en cuir.'),
        **fields,
    )


def variant(product_, size=42, color_=None, stock=5):
    return Variant.objects.create(product=product_, size=Decimal(str(size)), color=color_ or color(), stock=stock)
