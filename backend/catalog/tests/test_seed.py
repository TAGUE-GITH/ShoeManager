"""Commande seed_demo : catalogue de demonstration."""

import pytest
from django.core.management import call_command

from accounts.models import Role, User
from catalog.models import Category, Product, Variant


@pytest.mark.django_db
class TestSeedDemo:
    def test_fills_a_realistic_catalog(self):
        call_command('seed_demo', verbosity=0)

        assert Category.objects.filter(parent__isnull=True).count() >= 3
        assert Category.objects.filter(parent__isnull=False).count() >= 6
        assert Product.objects.filter(is_published=True).count() >= 12
        # Chaque produit a plusieurs pointures, et quelques-unes sont epuisees
        assert all(p.variants.count() >= 3 for p in Product.objects.all())
        assert Variant.objects.filter(stock=0).exists()

    def test_creates_one_account_per_role_for_local_development(self, settings):
        settings.DEBUG = True
        call_command('seed_demo', verbosity=0)

        for role in Role.values:
            assert User.objects.filter(role=role, email__endswith='@franckshoese.example').exists()

    def test_only_the_demo_customer_exists_in_production(self, settings):
        settings.DEBUG = False
        call_command('seed_demo', verbosity=0)

        demo = User.objects.filter(email__endswith='@franckshoese.example')
        assert list(demo.values_list('role', flat=True)) == [Role.CLIENT]

    def test_can_be_run_twice_without_duplicates(self):
        call_command('seed_demo', verbosity=0)
        products = Product.objects.count()

        call_command('seed_demo', verbosity=0)

        assert Product.objects.count() == products
