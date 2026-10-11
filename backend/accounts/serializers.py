from django.contrib.auth import authenticate, password_validation
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Role, User


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


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """US-03 : nouveau mot de passe choisi grace au lien recu par email."""

    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(attrs['uid'])), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError(
                {'detail': _('Ce lien est invalide ou a expiré. Faites une nouvelle demande.')}
            )
        try:
            password_validation.validate_password(attrs['password'], user)
        except Exception as error:
            raise serializers.ValidationError({'password': list(error.messages)}) from error
        attrs['user'] = user
        return attrs


class TeamMemberSerializer(serializers.ModelSerializer):
    """US-04 : membres de l'equipe (gerant et vendeurs)."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'role', 'is_active', 'last_login', 'date_joined']
        read_only_fields = ['last_login', 'date_joined']

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email__iexact=email).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError(_('Un compte existe déjà avec cet email.'))
        return email

    def validate_role(self, role):
        if role not in (Role.VENDEUR, Role.GERANT):
            raise serializers.ValidationError(_('Un membre de l’équipe est vendeur ou gérant.'))
        return role

    def validate(self, attrs):
        # Le gerant connecte ne peut ni se desactiver ni perdre son role (la boutique resterait sans gerant)
        request = self.context['request']
        if self.instance is not None and self.instance.pk == request.user.pk:
            if attrs.get('is_active') is False or attrs.get('role', Role.GERANT) != Role.GERANT:
                raise serializers.ValidationError(
                    {'detail': _('Vous ne pouvez pas désactiver votre propre compte ni retirer votre rôle de gérant.')}
                )
        return attrs

    def create(self, validated_data):
        validated_data.setdefault('role', Role.VENDEUR)
        # Pas de mot de passe : le vendeur choisit le sien avec le lien recu par email
        return User.objects.create_user(password=None, **validated_data)


class CustomerSerializer(serializers.ModelSerializer):
    """US-21 : fiche client vue par la boutique."""

    orders_count = serializers.IntegerField(read_only=True)
    purchases_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'phone',
            'role',
            'is_active',
            'loyalty_points',
            'date_joined',
            'orders_count',
            'purchases_count',
        ]
        # Le gerant change seulement le role (client -> vendeur ou gerant) et bloque ou debloque le compte
        read_only_fields = ['email', 'first_name', 'last_name', 'phone', 'loyalty_points', 'date_joined']


class DemoSerializer(serializers.Serializer):
    # Pas de vendeur ni de gerant publics : ils pourraient modifier la vraie boutique
    role = serializers.ChoiceField(choices=[(Role.CLIENT, Role.CLIENT.label)], default=Role.CLIENT)
