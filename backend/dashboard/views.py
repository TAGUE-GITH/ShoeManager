from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsManager

from . import services


class DashboardView(APIView):
    """US-20 : chiffre d'affaires, meilleures ventes, pointures, activite a traiter (gerant)."""

    permission_classes = [IsManager]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        return Response(services.dashboard())


class StockAlertsView(APIView):
    """US-19 : declinaisons en stock bas ou epuisees (gerant)."""

    permission_classes = [IsManager]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        return Response(services.stock_alert_rows())
