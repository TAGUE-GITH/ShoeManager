<h1 align="center">ShoeManager</h1>

**Boutique en ligne et outil de gestion pour un magasin de chaussures** : catalogue par catégories, commande en ligne avec livraison ou retrait, réservation de paires pour essayage, caisse en boutique, gestion du stock par pointure et couleur, et tableau de bord.

Projet full-stack réalisé en **équipe de 3**, en méthode **Agile (Scrum + Kanban)** et en **TDD**.

![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-REST%20Framework-092E20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

> **État du projet :** terminé et en ligne.

**🔗 Essayer l'application : [shoe-manager.vercel.app](https://shoe-manager.vercel.app)** — bouton « Essayer en client », sans créer de compte. L'espace boutique (gérant, vendeurs) est réservé au personnel : la boutique en ligne est réelle.
API : [shoemanager-api.onrender.com/api/docs/](https://shoemanager-api.onrender.com/api/docs/) (documentation interactive). Hébergement gratuit : le premier chargement peut prendre une minute, le temps que le serveur se réveille.

![CI](https://github.com/TAGUE-GITH/ShoeManager/actions/workflows/ci.yml/badge.svg)

## Le besoin

La boutique **FranckShoese** (Douala) gérait ses ventes sur un cahier et ses réservations par WhatsApp : paires vendues deux fois, stock inexact, aucune vente possible en dehors des heures d'ouverture. ShoeManager **centralise les données**, permet de **vendre et réserver en ligne** et **automatise** la gestion du stock.

## Fonctionnalités

**Pour les clients**
- Catalogue par catégories (Hommes › Baskets, Femmes › Sandales…), filtres par pointure, couleur, marque et prix
- Panier et commande en ligne : livraison au Cameroun et à l'étranger (Douala 1 000 FCFA, autres villes 10 %, étranger 20 % dès 5 paires, −10 % sur la livraison dès 10 paires) ou retrait gratuit en boutique
- Réservation d'une paire pour l'essayer en boutique (bloquée 48 h, expiration automatique)
- Suivi des commandes ; ajout de paires tant que la commande n'est pas en préparation, puis « Commander à nouveau » ; points de fidélité

**Pour la boutique**
- Produits (ajout, modification, photos, suppression), catégories, déclinaisons (pointure + couleur) et stock, alertes de stock bas
- Traitement des commandes (recherche par référence ou client) et des réservations
- Clients : rôle (client, vendeur, gérant), blocage, suppression ; équipe avec invitation par email
- Caisse en boutique avec reçu PDF
- Tableau de bord : chiffre d'affaires, meilleures ventes, pointures les plus demandées

## Conception (Sprint 0)

| Document | Contenu |
|---|---|
| [Cahier des charges](docs/01-cahier-des-charges.md) | Contexte, acteurs, fonctionnalités, règles métier, exigences |
| [User stories](docs/02-user-stories.md) | 23 stories avec critères d'acceptation, découpage en sprints, définition de « terminé » |
| [Modèle de données](docs/03-modele-de-donnees.md) | Diagramme entité-association et choix de conception |
| [Architecture](docs/04-architecture.md) | Vue d'ensemble, organisation du code, routes de l'API, Docker, CI, déploiement |
| [Organisation de l'équipe](docs/05-organisation-equipe.md) | Rôles, cérémonies Scrum, tableau Kanban, flux Git |

## Stack technique

| Couche | Technologies |
|---|---|
| Backend | Python, Django, Django REST Framework, JWT |
| Base de données | PostgreSQL |
| Frontend | React.js, Vite, React Router, Tailwind CSS |
| Tests | pytest, pytest-django (TDD) ; Vitest |
| DevOps | Docker, docker compose, GitHub Actions |
| Méthode | Scrum, Kanban (GitHub Projects), GitHub Flow |

## Avancement

| Sprint | Contenu | État |
|---|---|---|
| 0 | Analyse, conception, environnement | ✅ |
| 1 | Comptes (inscription, connexion JWT) et catalogue (rayons, filtres, fiche produit) | ✅ |
| 2 | Panier, commande en ligne (livraison ou retrait), suivi, traitement par la boutique, emails | ✅ |
| 3 | Réservation 48 h avec expiration automatique, encaissement en boutique, caisse, reçu PDF | ✅ |
| 4 | Tableau de bord du gérant, catalogue avec photos, alertes de stock, équipe, fiches clients, mot de passe oublié, comptes de démonstration | ✅ |
| 5 | Mise en ligne (Render, Neon, Vercel, Brevo) : voir [DEPLOIEMENT.md](DEPLOIEMENT.md) | ✅ |

## Lancer le projet en local

**Avec Docker** (API + PostgreSQL) :

```bash
docker compose up --build
```

**Sans Docker** — API sur http://localhost:8000 (documentation interactive : `/api/docs/`) :

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Linux / macOS : source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo        # catalogue et comptes de démonstration
python manage.py runserver
```

Interface sur http://localhost:5173, dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

Les réservations non honorées expirent automatiquement : une réservation échue ne bloque plus la paire, et son statut passe à « Expirée » dès qu'une liste de réservations est consultée (la commande `python manage.py expire_reservations` peut aussi être planifiée).

Comptes de démonstration **en local uniquement** (créés par `seed_demo`, mot de passe `demo-franckshoese`) : `gerant@franckshoese.example`, `vendeur@franckshoese.example`, `client@franckshoese.example`. En production, seul le client de démonstration existe, sans mot de passe (bouton « Essayer »), et le gérant est le compte désigné par `MANAGER_EMAIL` (voir [DEPLOIEMENT.md](DEPLOIEMENT.md)).

## Tests

```bash
cd backend && pytest       # API : 197 tests
cd frontend && npm test    # interface : 32 tests
```

Les tests sont écrits avant le code (TDD), à partir des critères d'acceptation des user stories. GitHub Actions les exécute à chaque envoi, avec une vraie base PostgreSQL.
