"""Outils communs aux tests : client de l'API et creation rapide d'utilisateurs connectes."""

import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User

PASSWORD = 'motdepasse-solide-2026'


@pytest.fixture(autouse=True)
def no_demo_photo_download(settings):
    """Les tests ne telechargent jamais de photos sur Internet."""
    settings.DEMO_PHOTOS = False


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def make_user(db):
    counter = {'n': 0}

    def factory(role=Role.CLIENT, **fields):
        counter['n'] += 1
        fields.setdefault('email', f'utilisateur{counter["n"]}@test.cm')
        fields.setdefault('first_name', 'Test')
        fields.setdefault('last_name', f'Utilisateur {counter["n"]}')
        return User.objects.create_user(password=PASSWORD, role=role, **fields)

    return factory


@pytest.fixture
def client_for(make_user):
    """Client de l'API deja authentifie avec un utilisateur du role demande."""

    def factory(role=Role.CLIENT):
        client = APIClient()
        client.force_authenticate(user=make_user(role=role))
        return client

    return factory


@pytest.fixture(autouse=True)
def fast_password_hasher(settings):
    """Tests uniquement : hachage rapide des mots de passe (l'algorithme lent reste celui de la production)."""
    settings.PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']


@pytest.fixture(autouse=True)
def clear_cache():
    """Compteurs de limitation des requetes remis a zero entre les tests."""
    from django.core.cache import cache

    cache.clear()
