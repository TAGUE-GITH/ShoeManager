"""
Donne le role de gerant (et l'acces a l'administration Django) au compte de MANAGER_EMAIL.

Lancee a chaque demarrage du serveur : sur l'hebergement gratuit, il n'y a pas de terminal pour creer un gerant.
Le proprietaire s'inscrit sur le site avec son email, puis renseigne MANAGER_EMAIL chez l'hebergeur.
"""

import os

from django.core.management.base import BaseCommand

from accounts.models import Role, User


class Command(BaseCommand):
    help = 'Donne le rôle de gérant au compte indiqué par la variable MANAGER_EMAIL.'

    def handle(self, *args, **options):
        email = os.environ.get('MANAGER_EMAIL', '').strip()
        if not email:
            return
        updated = User.objects.filter(email__iexact=email).update(
            role=Role.GERANT, is_staff=True, is_superuser=True, is_active=True
        )
        if updated:
            self.stdout.write(self.style.SUCCESS(f'{email} est gérant de la boutique.'))
        else:
            message = f'Aucun compte avec l’email {email} : inscrivez-vous d’abord sur le site.'
            self.stdout.write(self.style.WARNING(message))
