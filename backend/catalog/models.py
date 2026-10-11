from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Count, F, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce, Greatest
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


def unique_slug(instance, base, prefix=''):
    """Slug lisible et unique : 'baskets', puis 'femmes-baskets' ou 'baskets-2' en cas de doublon."""
    model = type(instance)
    candidates = [slugify(base)]
    if prefix:
        candidates.append(slugify(f'{prefix}-{base}'))
    for candidate in candidates:
        if not model.objects.filter(slug=candidate).exclude(pk=instance.pk).exists():
            return candidate
    counter = 2
    while model.objects.filter(slug=f'{candidates[0]}-{counter}').exclude(pk=instance.pk).exists():
        counter += 1
    return f'{candidates[0]}-{counter}'


class Category(models.Model):
    """Categorie en arbre (deux niveaux suffisent : Hommes > Baskets)."""

    name = models.CharField(_('nom'), max_length=80)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    parent = models.ForeignKey(
        'self',
        verbose_name=_('catégorie parente'),
        null=True,
        blank=True,
        related_name='children',
        on_delete=models.PROTECT,
    )
    # Ordre d'affichage choisi par le gerant (Hommes, Femmes, Enfants...)
    position = models.PositiveSmallIntegerField(_('position'), default=0)

    class Meta:
        verbose_name = _('catégorie')
        ordering = ['position', 'name']

    def __str__(self):
        return f'{self.parent} › {self.name}' if self.parent else self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name, prefix=self.parent.name if self.parent else '')
        super().save(*args, **kwargs)

    def descendant_ids(self):
        """La categorie et ses sous-categories (pour filtrer le catalogue)."""
        return [self.id, *self.children.values_list('id', flat=True)]


class Brand(models.Model):
    name = models.CharField(_('nom'), max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        verbose_name = _('marque')
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name)
        super().save(*args, **kwargs)


class Color(models.Model):
    name = models.CharField(_('nom'), max_length=40, unique=True)
    hex_code = models.CharField(_('code couleur'), max_length=7, default='#000000')

    class Meta:
        verbose_name = _('couleur')
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(_('nom'), max_length=120)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(_('description'), blank=True)
    category = models.ForeignKey(
        Category, verbose_name=_('catégorie'), related_name='products', on_delete=models.PROTECT
    )
    brand = models.ForeignKey(Brand, verbose_name=_('marque'), related_name='products', on_delete=models.PROTECT)
    # Francs CFA : pas de centimes
    price = models.DecimalField(_('prix'), max_digits=12, decimal_places=0, validators=[MinValueValidator(1)])
    low_stock_threshold = models.PositiveIntegerField(_('seuil de stock bas'), default=3)
    is_published = models.BooleanField(_('visible dans la boutique'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('produit')
        ordering = ['-created_at', 'name']

    def __str__(self):
        return f'{self.brand} {self.name}'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name)
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    """
    Photo d'un produit, stockee en base de donnees (deja redimensionnee et compressee en WebP) :
    les hebergeurs gratuits effacent les fichiers enregistres sur le disque a chaque redeploiement.
    """

    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    data = models.BinaryField(_('photo'))
    content_type = models.CharField(max_length=30, default='image/webp')
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = _('photo')
        ordering = ['position', 'id']

    def __str__(self):
        return f'{self.product} (photo {self.position})'

    @property
    def url(self):
        return f'/api/images/{self.pk}/'


class VariantQuerySet(models.QuerySet):
    def with_available(self):
        """
        Stock disponible (regle R2) = stock physique - paires commandees mais pas encore preparees
        - paires reservees (reservations actives et non echues). Calcule par la base, jamais stocke.
        """
        from orders.models import PENDING_STATUSES, OrderItem
        from reservations.models import Reservation

        ordered = (
            OrderItem.objects.filter(variant=OuterRef('pk'), order__status__in=PENDING_STATUSES)
            .values('variant')
            .annotate(total=Sum('quantity'))
            .values('total')
        )
        reserved = (
            Reservation.objects.holding()
            .filter(variant=OuterRef('pk'))
            .values('variant')
            .annotate(total=Count('id'))
            .values('total')
        )
        held = Coalesce(Subquery(ordered), Value(0)) + Coalesce(Subquery(reserved), Value(0))
        return self.annotate(available=Greatest(F('stock') - held, Value(0)))


class Variant(models.Model):
    """Declinaison d'un produit : une pointure dans une couleur, avec son propre stock."""

    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
    size = models.DecimalField(_('pointure'), max_digits=4, decimal_places=1, validators=[MinValueValidator(15)])
    color = models.ForeignKey(Color, verbose_name=_('couleur'), related_name='variants', on_delete=models.PROTECT)
    stock = models.PositiveIntegerField(_('stock physique'), default=0)
    sku = models.CharField(_('référence'), max_length=40, unique=True, blank=True)

    objects = VariantQuerySet.as_manager()

    class Meta:
        verbose_name = _('déclinaison')
        ordering = ['size', 'color__name']
        constraints = [
            models.UniqueConstraint(fields=['product', 'size', 'color'], name='unique_size_color_per_product'),
        ]

    def __str__(self):
        return f'{self.product} — {format_size(self.size)} {self.color}'

    def save(self, *args, **kwargs):
        if not self.sku:
            self.sku = f'P{self.product_id}-{format_size(self.size)}-{slugify(self.color.name)[:3].upper()}'
        super().save(*args, **kwargs)


def format_size(size):
    """42.0 -> '42' ; 37.5 -> '37.5'."""
    text = f'{size:f}'
    return text.rstrip('0').rstrip('.') if '.' in text else text
