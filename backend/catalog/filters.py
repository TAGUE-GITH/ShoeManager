import django_filters
from django.db.models import Exists, OuterRef, Q

from .models import Category, Product, Variant


class ProductFilter(django_filters.FilterSet):
    """Filtres du catalogue (US-07) : tous combinables."""

    category = django_filters.CharFilter(method='filter_category')
    brand = django_filters.CharFilter(field_name='brand__slug')
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    size = django_filters.NumberFilter(method='filter_variant')
    color = django_filters.NumberFilter(method='filter_variant')
    search = django_filters.CharFilter(method='filter_search')

    class Meta:
        model = Product
        fields = []

    def filter_category(self, queryset, name, slug):
        category = Category.objects.filter(slug=slug).first()
        if category is None:
            return queryset.none()
        return queryset.filter(category_id__in=category.descendant_ids())

    def filter_variant(self, queryset, name, value):
        # Pointure et couleur sont appliquees ensemble (meme declinaison) dans filter_queryset
        return queryset

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(name__icontains=value) | Q(brand__name__icontains=value))

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        size, color = self.form.cleaned_data.get('size'), self.form.cleaned_data.get('color')
        if size is not None or color is not None:
            # Une meme declinaison doit avoir la pointure ET la couleur, et au moins une paire disponible
            variants = Variant.objects.with_available().filter(product=OuterRef('pk'), available__gt=0)
            if size is not None:
                variants = variants.filter(size=size)
            if color is not None:
                variants = variants.filter(color_id=color)
            queryset = queryset.filter(Exists(variants))
        return queryset
