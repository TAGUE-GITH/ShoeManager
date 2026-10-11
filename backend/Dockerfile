# API Django de ShoeManager
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Utilisateur sans droits d'administration dans le conteneur
RUN useradd --create-home app && mkdir -p /app/media /app/staticfiles && chown -R app /app
USER app

RUN DJANGO_DEBUG=true python manage.py collectstatic --noinput

EXPOSE 8000

# Migrations au demarrage, puis serveur de production (gunicorn)
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 60"]
