"""Premier gerant de la boutique : compte designe par la variable MANAGER_EMAIL au demarrage du serveur."""

import pytest
from django.core.management import call_command

from accounts.models import Role, User


@pytest.mark.django_db
class TestPromoteManager:
    def test_the_account_becomes_manager_and_administrator(self, make_user, monkeypatch):
        user = make_user(role=Role.CLIENT, email='franck@test.cm')
        monkeypatch.setenv('MANAGER_EMAIL', 'Franck@Test.cm')

        call_command('promote_manager', verbosity=0)

        user.refresh_from_db()
        assert user.role == Role.GERANT
        assert user.is_staff and user.is_superuser

    def test_nothing_happens_without_the_variable(self, make_user, monkeypatch):
        user = make_user(role=Role.CLIENT)
        monkeypatch.delenv('MANAGER_EMAIL', raising=False)

        call_command('promote_manager', verbosity=0)

        user.refresh_from_db()
        assert user.role == Role.CLIENT

    def test_unknown_email_does_not_stop_the_server(self, monkeypatch):
        monkeypatch.setenv('MANAGER_EMAIL', 'personne@test.cm')

        call_command('promote_manager', verbosity=0)

        assert not User.objects.filter(role=Role.GERANT).exists()
