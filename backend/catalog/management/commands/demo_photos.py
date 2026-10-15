"""Photos des chaussures de demonstration (lance au demarrage) : python manage.py demo_photos"""

from django.core.management.base import BaseCommand

from catalog.demo_photos import add_demo_photos


class Command(BaseCommand):
    help = 'Ajoute leur photo aux modèles de démonstration qui n’en ont pas encore.'

    def handle(self, *args, **options):
        self.stdout.write(f'Photos de démonstration ajoutées : {add_demo_photos()}')
