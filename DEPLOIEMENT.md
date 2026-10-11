# Mise en ligne de ShoeManager

Tout est gratuit : **Neon** (base PostgreSQL), **Render** (API Django), **Vercel** (site React) et **Brevo** (emails).
Aucun mot de passe ni aucune clé n'est écrit dans le code : on les saisit uniquement dans les tableaux de bord des hébergeurs.

```
Navigateur ──► Vercel (site React) ──► Render (API Django, Docker) ──► Neon (PostgreSQL)
                                                 └──► Brevo (emails)
```

## 1. Base de données — Neon

1. Sur [console.neon.tech](https://console.neon.tech), créer un projet `shoemanager` (région **Europe, Frankfurt**).
2. Dans **Connect**, décocher **Connection pooling**, puis copier l'adresse de connexion
   (`postgresql://…neon.tech/neondb?sslmode=require…`). C'est la valeur de `DATABASE_URL`.

## 2. API — Render

1. Sur [dashboard.render.com](https://dashboard.render.com) : **New** → **Blueprint**, choisir le dépôt `ShoeManager`.
   Render lit le fichier [`render.yaml`](render.yaml) et prépare le service `shoemanager-api`.
2. Renseigner les valeurs demandées :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | l'adresse copiée sur Neon |
| `FRONTEND_URL` | l'adresse du site Vercel (étape 3), par exemple `https://shoe-manager.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | la même adresse que `FRONTEND_URL` |
| `BREVO_API_KEY` | la clé de l'API Brevo (étape 4) |
| `DEFAULT_FROM_EMAIL` | `FranckShoese <adresse-verifiee-sur-brevo>` |

3. **Apply** : Render construit l'image Docker, applique les migrations puis démarre gunicorn.
   Vérification : `https://shoemanager-api.onrender.com/api/health/` répond `{"status":"ok"}`.

Les données de démonstration (rayons, 15 modèles, comptes client / vendeur / gérant) sont créées au premier clic
sur un bouton « Essayer » du site.

> Offre gratuite : le service s'endort après 15 minutes sans visite et met environ une minute à se réveiller.
> Les réservations dépassées passent au statut « Expirée » dès qu'une liste de réservations est consultée
> (pas besoin de tâche planifiée).

## 3. Site — Vercel

1. Sur [vercel.com/new](https://vercel.com/new), importer le dépôt `ShoeManager`.
2. **Root Directory** : `frontend` (Vercel détecte Vite).
3. **Environment Variables** : `VITE_API_URL` = `https://shoemanager-api.onrender.com` (sans `/` final).
4. **Deploy**. Le fichier [`frontend/vercel.json`](frontend/vercel.json) renvoie toutes les adresses vers l'application React.
5. Reporter l'adresse obtenue dans `FRONTEND_URL` et `CORS_ALLOWED_ORIGINS` sur Render.

## 4. Emails — Brevo

1. Sur [app.brevo.com](https://app.brevo.com) : **Senders, Domains & Dedicated IPs** → vérifier l'adresse d'expédition.
2. **SMTP & API** → **API Keys** → **Generate a new API key** : c'est `BREVO_API_KEY`.

Les emails partent par l'API web de Brevo ([`common/mail.py`](backend/common/mail.py)) : Render bloque les ports SMTP
sur l'offre gratuite.

## Mises à jour

Chaque `git push` sur `main` lance les tests (GitHub Actions), puis Render et Vercel redéploient automatiquement.
