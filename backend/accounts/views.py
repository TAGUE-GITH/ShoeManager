from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer, tokens_for


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
