# Organisation de l'équipe — Scrum et Kanban

Projet réalisé par une **équipe de 3 développeurs full-stack**, en méthode **Agile (Scrum)** avec un **tableau Kanban** sur GitHub Projects.

## Rôles

| Membre | Rôle Scrum | Responsabilité principale | Responsabilité secondaire |
|---|---|---|---|
| Développeur 1 | Product Owner + développeur | Backend : catalogue, commandes, réservations | Rédaction des user stories, priorités |
| Développeur 2 | Scrum Master + développeur | Frontend : boutique et espace de gestion | Animation des cérémonies, suivi du tableau |
| Développeur 3 | Développeur | Comptes, sécurité, tests, Docker et CI/CD | Déploiement, revue de la qualité |

Chaque membre écrit **du backend et du frontend** au fil des sprints (full-stack) ; la colonne « principale » indique qui pilote le sujet.

## Cérémonies Scrum (sprint d'une semaine)

| Cérémonie | Quand | Durée | Contenu |
|---|---|---|---|
| Planification du sprint | Lundi | 1 h | Choix des stories, découpage en tâches, estimation |
| Daily meeting | Chaque jour | 15 min | Hier, aujourd'hui, points de blocage |
| Revue de sprint | Vendredi | 30 min | Démonstration des stories terminées |
| Rétrospective | Vendredi | 30 min | Ce qui a marché, ce qu'on améliore |

## Tableau Kanban (GitHub Projects)

| Backlog | À faire (sprint) | En cours | En revue | Terminé |
|---|---|---|---|---|
| Toutes les stories priorisées | Stories du sprint | Une tâche à la fois par personne | Pull request ouverte | Définition de « terminé » respectée |

Règle : **2 tâches « En cours » au maximum par personne** (limite de travail en cours), pour finir avant de commencer.

## Flux Git (GitHub Flow)

1. Une **issue** par story ou tâche (ex. `#14 Réserver une paire`) ;
2. Une **branche** par issue : `feature/14-reservation`, `fix/31-stock-negatif` ;
3. Des **commits** clairs, qui citent l'issue ;
4. Une **pull request** vers `main`, relue et approuvée par un autre membre ;
5. **GitHub Actions** doit être au vert (tests + linter) avant la fusion ;
6. La branche `main` est protégée : aucun envoi direct.

## Conventions

- Code et noms techniques en anglais, documentation et interface en français (et anglais) ;
- Backend formaté avec **Ruff** ; frontend avec **ESLint** et **Prettier** ;
- Toute règle métier est couverte par un test avant d'être codée (TDD).
