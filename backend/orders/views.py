from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsStaffMember

from . import services
from .delivery import DESTINATIONS, rules
from .models import Order
from .serializers import ChangeStatusSerializer, ManageOrderSerializer, OrderSerializer, PlaceOrderSerializer

ORDER_PREFETCH = ['items__variant__color', 'items__variant__product']


class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """US-10, US-11, US-13 : le client commande, suit et annule ses propres commandes."""

    serializer_class = OrderSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # generation de la documentation
            return Order.objects.none()
        # Un client ne voit jamais les commandes d'un autre (404)
        return Order.objects.filter(customer=self.request.user).prefetch_related(*ORDER_PREFETCH)

    @extend_schema(request=PlaceOrderSerializer, responses={201: OrderSerializer})
    def create(self, request, *args, **kwargs):
        payload = PlaceOrderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        order = services.place_order(request.user, **payload.validated_data)
        return Response(OrderSerializer(self.get_queryset().get(pk=order.pk)).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses=OrderSerializer)
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = services.cancel_by_customer(self.get_object())
        return Response(OrderSerializer(self.get_queryset().get(pk=order.pk)).data)


class ManageOrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """US-12 : la boutique (gerant et vendeurs) traite toutes les commandes."""

    permission_classes = [IsStaffMember]
    serializer_class = ManageOrderSerializer
    filter_backends = [filters.DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status', 'delivery_mode']
    search_fields = ['reference', 'customer__email', 'customer__first_name', 'customer__last_name', 'phone']
    queryset = Order.objects.select_related('customer').prefetch_related(*ORDER_PREFETCH)

    @extend_schema(request=ChangeStatusSerializer, responses=ManageOrderSerializer)
    @action(detail=True, methods=['patch'], url_path='status', serializer_class=ChangeStatusSerializer)
    def change_status(self, request, pk=None):
        payload = ChangeStatusSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        order = services.change_status(self.get_object(), payload.validated_data['status'])
        return Response(ManageOrderSerializer(self.get_queryset().get(pk=order.pk)).data)


class DeliveryView(APIView):
    """R8 : destinations de livraison et regles de calcul des frais (affichees avant la commande)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        responses=inline_serializer(
            'Delivery',
            {
                'destinations': inline_serializer(
                    'Destination',
                    {'key': serializers.CharField(), 'label': serializers.CharField(), 'zone': serializers.CharField()},
                    many=True,
                ),
                'rules': serializers.DictField(),
            },
        )
    )
    def get(self, request):
        return Response(
            {
                'destinations': [{'key': key, 'label': label, 'zone': zone} for key, label, zone in DESTINATIONS],
                'rules': rules(),
            }
        )
