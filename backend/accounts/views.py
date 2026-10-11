from django.conf import settings
from django.db.models import Count, Q
from django.utils.translation import gettext as _
from rest_framework import generics, mixins, status, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from catalog.demo import demo_email, seed
from catalog.models import Product
from common.permissions import IsManager, IsStaffMember

from .emails import send_password_email
from .models import Role, User
from .serializers import (
    CustomerSerializer,
    DemoSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    TeamMemberSerializer,
    UserSerializer,
    tokens_for,
)


class RegisterView(generics.CreateAPIView):
    """US-01 : inscription d'un client, connecte directement."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(tokens_for(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """US-02 : connexion par email et mot de passe."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = LoginSerializer

    # Identifiants incorrects : 401 (et non 403), comme pour un jeton invalide
    def get_authenticate_header(self, request):
        return 'Bearer'

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response(tokens_for(serializer.validated_data['user']))


class MeView(generics.RetrieveAPIView):
    """Profil de l'utilisateur connecte."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    """US-03 : envoie un lien de reinitialisation. Reponse identique que le compte existe ou non."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data['email'], is_active=True).first()
        if user is not None:
            send_password_email(user)
        return Response({'detail': _('Si un compte existe avec cet email, un lien vient de vous être envoyé.')})


class PasswordResetConfirmView(APIView):
    """US-03 : nouveau mot de passe ; le lien ne fonctionne qu'une fois."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['password'])
        user.save(update_fields=['password'])
        return Response({'detail': _('Votre mot de passe a été modifié. Vous pouvez vous connecter.')})


class DemoView(APIView):
    """US-22 : connexion en un clic a un compte de demonstration (client, vendeur ou gerant)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'demo'
    serializer_class = DemoSerializer

    def post(self, request):
        if not settings.DEMO_ENABLED:
            raise NotFound()
        serializer = DemoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data['role']
        # Boutique vide (premiere visite, base reinitialisee) : on la remplit avant de connecter
        if not Product.objects.exists() or not User.objects.filter(email=demo_email(role)).exists():
            seed()
        user = User.objects.get(email=demo_email(role))
        return Response(tokens_for(user))


class TeamViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """US-04 : le gerant gere son equipe (creation de vendeurs, desactivation, role)."""

    permission_classes = [IsManager]
    serializer_class = TeamMemberSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'patch']
    queryset = User.objects.filter(role__in=[Role.GERANT, Role.VENDEUR]).order_by('-is_active', 'role', 'last_name')

    def perform_create(self, serializer):
        member = serializer.save()
        send_password_email(member, invitation=True)


class CustomerViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """US-21 : fiches clients (recherche par nom, email ou telephone) pour le gerant et les vendeurs."""

    permission_classes = [IsStaffMember]
    serializer_class = CustomerSerializer

    def get_queryset(self):
        queryset = User.objects.filter(role=Role.CLIENT).annotate(
            orders_count=Count('orders', distinct=True), purchases_count=Count('purchases', distinct=True)
        )
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone__icontains=search)
            )
        return queryset.order_by('-loyalty_points', 'last_name')
