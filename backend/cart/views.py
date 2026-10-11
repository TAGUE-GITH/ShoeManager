from django.db.models import F, OuterRef, Subquery
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Variant

from .models import Cart, CartItem
from .serializers import AddToCartSerializer, CartItemSerializer, CartSerializer


def cart_of(user):
    return Cart.objects.get_or_create(user=user)[0]


def cart_items(cart):
    """Lignes du panier, avec le stock disponible de chaque declinaison (pour l'affichage)."""
    available = Variant.objects.with_available().filter(pk=OuterRef('variant_id')).values('available')
    return (
        cart.items.select_related('variant__color', 'variant__product__brand', 'variant__product__category')
        .annotate(available=Subquery(available))
        .order_by(F('added_at').asc())
    )


class CartView(APIView):
    """US-09 : contenu du panier, total et nombre de paires."""

    @extend_schema(responses=CartSerializer)
    def get(self, request):
        items = list(cart_items(cart_of(request.user)))
        return Response(
            {
                'items': CartItemSerializer(items, many=True).data,
                'total': str(sum((item.variant.product.price * item.quantity for item in items), 0)),
                'count': sum(item.quantity for item in items),
            }
        )


class CartItemViewSet(
    mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """Ajout, modification de quantite et suppression d'une ligne (uniquement dans son propre panier)."""

    serializer_class = CartItemSerializer
    http_method_names = ['post', 'patch', 'delete']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # generation de la documentation
            return CartItem.objects.none()
        return cart_items(cart_of(self.request.user))

    @extend_schema(request=AddToCartSerializer, responses={201: CartItemSerializer})
    def create(self, request, *args, **kwargs):
        cart = cart_of(request.user)
        serializer = AddToCartSerializer(data=request.data, context={'cart': cart})
        serializer.is_valid(raise_exception=True)
        variant, quantity = serializer.validated_data['variant'], serializer.validated_data['quantity']
        item, created = CartItem.objects.get_or_create(cart=cart, variant=variant, defaults={'quantity': quantity})
        if not created:
            item.quantity += quantity
            item.save(update_fields=['quantity'])
        cart.save(update_fields=['updated_at'])
        item = self.get_queryset().get(pk=item.pk)
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)
