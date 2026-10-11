from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsStaffMember

from .models import Sale
from .receipt import build_receipt
from .serializers import CreateSaleSerializer, SaleSerializer
from .services import create_sale


class SaleViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """US-17 et US-18 : caisse de la boutique (gerant et vendeurs) et recu PDF."""

    permission_classes = [IsStaffMember]
    serializer_class = SaleSerializer
    queryset = Sale.objects.select_related('seller', 'customer', 'reservation').prefetch_related('items')

    @extend_schema(request=CreateSaleSerializer, responses={201: SaleSerializer})
    def create(self, request, *args, **kwargs):
        payload = CreateSaleSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        sale = create_sale(
            request.user,
            [(line['variant'], line['quantity']) for line in data['items']],
            data['payment_method'],
            customer=data.get('customer_email'),
        )
        return Response(SaleSerializer(self.get_queryset().get(pk=sale.pk)).data, status=status.HTTP_201_CREATED)

    @extend_schema(responses={(200, 'application/pdf'): OpenApiTypes.BINARY})
    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        sale = self.get_object()
        response = HttpResponse(build_receipt(sale), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="recu-{sale.reference}.pdf"'
        return response
