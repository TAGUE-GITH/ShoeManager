"""
Reglages de ShoeManager.

Tout ce qui change entre le developpement et la production est lu dans les variables d'environnement :
aucun secret n'est ecrit dans le code.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


def env_list(name, default=''):
    return [value.strip() for value in os.environ.get(name, default).split(',') if value.strip()]


DEBUG = os.environ.get('DJANGO_DEBUG', 'true').lower() == 'true'

# Cle de developpement uniquement : en production, DJANGO_SECRET_KEY est obligatoire
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-insecure-key-a-remplacer-en-production' if DEBUG else None)

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Bibliotheques
    'rest_framework',
    'django_filters',
    'corsheaders',
    'drf_spectacular',
    # Applications du projet
    'accounts',
    'catalog',
    'cart',
    'orders',
    'reservations',
    'sales',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# PostgreSQL via DATABASE_URL (Docker, CI, production) ; SQLite par defaut pour demarrer sans installation
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Langue : francais par defaut, anglais selon l'en-tete Accept-Language
LANGUAGE_CODE = 'fr'
LANGUAGES = [('fr', 'Français'), ('en', 'English')]
LOCALE_PATHS = [BASE_DIR / 'locale']
TIME_ZONE = 'Africa/Douala'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# API REST
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'ShoeManager API',
    'DESCRIPTION': 'Boutique en ligne et gestion d’un magasin de chaussures',
    'VERSION': '1.0.0',
    # Noms distincts pour les listes de choix homonymes (commandes, reservations, caisse)
    'ENUM_NAME_OVERRIDES': {
        'OrderStatusEnum': 'orders.models.OrderStatus',
        'OrderPaymentMethodEnum': 'orders.models.PaymentMethod',
        'ReservationStatusEnum': 'reservations.models.ReservationStatus',
        'SalePaymentMethodEnum': 'sales.models.SalePaymentMethod',
    },
}

# Emails : affiches dans la console en developpement ; serveur SMTP ou API en production
MAILERS = {
    'default': {
        'BACKEND': os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend'),
    },
}
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'FranckShoese <no-reply@franckshoese.example>')

# Seul le frontend peut appeler l'API depuis un navigateur
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')
