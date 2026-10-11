from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class Role(models.TextChoices):
    CLIENT = 'CLIENT', _('Client')
    VENDEUR = 'VENDEUR', _('Vendeur')
    GERANT = 'GERANT', _('Gérant')


class UserManager(BaseUserManager):
    """Connexion par email (pas de nom d'utilisateur) ; l'email est enregistre en minuscules."""

    use_in_migrations = True

    def _create_user(self, email, password, **fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        user = self.model(email=self.normalize_email(email).lower(), **fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **fields):
        fields.setdefault('role', Role.CLIENT)
        return self._create_user(email, password, **fields)

    def create_superuser(self, email, password=None, **fields):
        fields.update(is_staff=True, is_superuser=True, role=Role.GERANT)
        return self._create_user(email, password, **fields)


class User(AbstractUser):
    username = None
    email = models.EmailField(_('email'), unique=True)
    phone = models.CharField(_('téléphone'), max_length=30, blank=True)
    role = models.CharField(_('rôle'), max_length=10, choices=Role.choices, default=Role.CLIENT)
    loyalty_points = models.PositiveIntegerField(_('points de fidélité'), default=0)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    class Meta:
        verbose_name = _('utilisateur')
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.get_full_name()} <{self.email}>'

    @property
    def is_staff_member(self):
        """Gerant ou vendeur : acces a l'espace de gestion."""
        return self.role in (Role.GERANT, Role.VENDEUR)
