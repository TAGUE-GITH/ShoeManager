"""Catalogue et comptes de demonstration : python manage.py seed_demo"""

from django.core.management.base import BaseCommand

from catalog.demo import seed
from catalog.models import Product, Variant


class Command(BaseCommand):
    help = 'Remplit la base avec un catalogue et des comptes de démonstration.'

    def handle(self, *args, **options):
        seed()
        self.stdout.write(
            self.style.SUCCESS(
                f'Catalogue prêt : {Product.objects.count()} produits, {Variant.objects.count()} déclinaisons.'
            )
        )
