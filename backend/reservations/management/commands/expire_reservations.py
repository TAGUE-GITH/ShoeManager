"""
US-15 : expiration des reservations non honorees.

A lancer regulierement (tache planifiee, par exemple toutes les 15 minutes) : python manage.py expire_reservations
Meme si la tache n'a pas encore tourne, une reservation echue ne bloque deja plus la paire (voir with_available).
"""

from django.core.management.base import BaseCommand

from reservations.services import expire_reservations


class Command(BaseCommand):
    help = 'Passe au statut « Expirée » les réservations de plus de 48 heures.'

    def handle(self, *args, **options):
        count = expire_reservations()
        self.stdout.write(self.style.SUCCESS(f'{count} réservation(s) expirée(s).'))
