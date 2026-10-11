from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsStaffMember
from sales.serializers import SaleSerializer

from . import services
from .models import Reservation
from .serializers import (
    CreateReservationSerializer,
    HonorSerializer,
    ManageReservationSerializer,
    ReservationSerializer,
)

RELATED = ['variant__product__brand', 'variant__color', 'customer']


class ReservationViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """US-14 : le client reserve une paire, voit et annule ses reservations."""

    serializer_class = ReservationSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # generation de la documentation
            return Reservation.objects.none()
        return Reservation.objects.filter(customer=self.request.user).select_related(*RELATED)

    @extend_schema(request=CreateReservationSerializer, responses={201: ReservationSerializer})
    def create(self, request, *args, **kwargs):
        payload = CreateReservationSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        reservation = services.reserve(request.user, payload.validated_data['variant'])
        return Response(
            ReservationSerializer(self.get_queryset().get(pk=reservation.pk)).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(request=None, responses=ReservationSerializer)
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        services.cancel(self.get_object())
        return Response(ReservationSerializer(self.get_queryset().get(pk=pk)).data)


class ManageReservationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """US-16 : la boutique voit les reservations (les plus proches de l'echeance d'abord), les honore ou les annule."""

    permission_classes = [IsStaffMember]
    serializer_class = ManageReservationSerializer
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['status']
    queryset = Reservation.objects.select_related(*RELATED, 'sale').order_by('expires_at')

    @extend_schema(request=HonorSerializer, responses=SaleSerializer)
    @action(detail=True, methods=['post'])
    def honor(self, request, pk=None):
        payload = HonorSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        sale = services.honor(self.get_object(), request.user, payload.validated_data['payment_method'])
        return Response(SaleSerializer(sale).data)

    @extend_schema(request=None, responses=ManageReservationSerializer)
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        services.cancel(self.get_object())
        return Response(ManageReservationSerializer(self.get_queryset().get(pk=pk)).data)
