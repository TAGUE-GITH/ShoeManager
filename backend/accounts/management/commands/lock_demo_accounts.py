"""
Verrouille les comptes de demonstration en production (lancee a chaque demarrage du serveur).

Le mot de passe de demonstration est public (README) : en production, le vendeur et le gerant de demonstration
sont desactives et plus aucun compte de demonstration n'a de mot de passe.
"""

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.models import Role, User
from catalog.demo import demo_email


class Command(BaseCommand):
    help = 'Désactive les comptes de démonstration du personnel et retire les mots de passe de démonstration.'

    def handle(self, *args, **options):
        if settings.DEBUG:
            return
        for role in (Role.CLIENT, Role.VENDEUR, Role.GERANT):
            user = User.objects.filter(email=demo_email(role)).first()
            if user is None:
                continue
            user.set_unusable_password()
            if role != Role.CLIENT:
                user.is_active = False
            user.save(update_fields=['password', 'is_active'])
        self.stdout.write('Comptes de démonstration verrouillés.')
