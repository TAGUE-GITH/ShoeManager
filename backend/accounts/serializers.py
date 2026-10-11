from django.contrib.auth import authenticate, password_validation
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'role', 'loyalty_points']
        read_only_fields = fields


def tokens_for(user):
    """Jetons JWT (acces + rafraichissement) et profil, renvoyes apres inscription ou connexion."""
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh), 'user': UserSerializer(user).data}


class RegisterSerializer(serializers.ModelSerializer):
    """Inscription d'un client : le role n'est jamais choisi par le visiteur."""

    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'phone']

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(_('Un compte existe déjà avec cet email.'))
        return email

    def validate(self, attrs):
        candidate = User(email=attrs['email'], first_name=attrs['first_name'], last_name=attrs['last_name'])
        try:
            password_validation.validate_password(attrs['password'], candidate)
        except Exception as error:
            raise serializers.ValidationError({'password': list(error.messages)}) from error
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'), email=attrs['email'].lower(), password=attrs['password']
        )
        # Meme message dans tous les cas : on ne revele pas si le compte existe
        if user is None:
            raise AuthenticationFailed(_('Email ou mot de passe incorrect.'))
        attrs['user'] = user
        return attrs
