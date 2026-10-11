# Cahier des charges — ShoeManager

## 1. Contexte

**FranckShoese** est une boutique de chaussures à Douala. Aujourd'hui, les ventes sont notées sur un cahier, le stock est compté à la main et les clients réservent par téléphone ou WhatsApp. Conséquences :

- des paires vendues alors qu'elles ne sont plus en stock (ou mises de côté pour un client) ;
- aucune vision claire du chiffre d'affaires ni des modèles qui se vendent le mieux ;
- des clients qui ne peuvent pas consulter le catalogue ni commander en dehors des heures d'ouverture.

## 2. Objectif

Développer une application web qui permet à la boutique de :

1. **Vendre en ligne** : catalogue par catégories, commande avec livraison ou retrait en boutique ;
2. **Gérer les réservations** : un client bloque une paire pour venir l'essayer ;
3. **Centraliser les données** : produits, stock, clients, commandes et ventes au même endroit ;
4. **Automatiser** : mise à jour du stock à chaque vente, expiration des réservations, alertes de stock bas, emails aux clients.

## 3. Utilisateurs (acteurs)

| Acteur | Description | Accès |
|---|---|---|
| **Visiteur** | Personne non connectée | Catalogue, recherche, fiche produit, inscription |
| **Client** | Visiteur inscrit | Panier, commandes, réservations, historique, profil |
| **Vendeur** | Employé de la boutique | Commandes, réservations, ventes en boutique (caisse), clients |
| **Gérant** | Responsable de la boutique | Tout, y compris produits, catégories, stock, équipe et tableau de bord |

## 4. Périmètre fonctionnel

### 4.1 Boutique en ligne (clients)

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F1 | Catalogue avec catégories et sous-catégories (ex. Hommes › Baskets) | Indispensable |
| F2 | Filtres : catégorie, pointure, couleur, marque, prix ; recherche par nom | Indispensable |
| F3 | Fiche produit : photos, description, pointures et couleurs disponibles en temps réel | Indispensable |
| F4 | Inscription, connexion, mot de passe oublié | Indispensable |
| F5 | Panier (ajout d'une déclinaison pointure + couleur, quantités) | Indispensable |
| F6 | Commande : livraison (adresse, quartier) ou retrait en boutique ; paiement à la livraison / en boutique, ou Mobile Money (mode démonstration) | Indispensable |
| F7 | Suivi de commande et historique | Indispensable |
| F8 | Réservation d'une paire pour essayage (48 h) et annulation | Indispensable |
| F9 | Emails : confirmation de commande, changement de statut, rappel de réservation | Souhaitable |
| F10 | Points de fidélité visibles dans le profil | Souhaitable |

### 4.2 Espace de gestion (boutique)

| N° | Fonctionnalité | Priorité |
|---|---|---|
| G1 | Gestion des catégories (arborescence) | Indispensable |
| G2 | Gestion des produits et de leurs déclinaisons (pointure, couleur, stock, photos) | Indispensable |
| G3 | Alertes de stock bas | Indispensable |
| G4 | Traitement des commandes (changement de statut) | Indispensable |
| G5 | Traitement des réservations (client venu, achat, annulation) | Indispensable |
| G6 | Vente en boutique (caisse) avec reçu PDF | Indispensable |
| G7 | Fiches clients et historique d'achat | Souhaitable |
| G8 | Tableau de bord : chiffre d'affaires, meilleures ventes, pointures demandées, ruptures | Indispensable |
| G9 | Gestion de l'équipe (vendeurs) | Souhaitable |

### 4.3 Transverse

- Interface **responsive** (téléphone en priorité, puis ordinateur) ;
- **Français / anglais** ;
- **Compte de démonstration** (boutique remplie de produits fictifs) ;
- Montants en **francs CFA (XAF)**.

### Hors périmètre (version 1)

- Paiement réel en ligne (le paiement Mobile Money est simulé ; un prestataire comme NotchPay ou CinetPay pourra être branché plus tard) ;
- Gestion de plusieurs boutiques ;
- Gestion des fournisseurs et des achats de marchandise ;
- Application mobile (l'API REST le permettra plus tard).

## 5. Règles métier

### Stock

- **R1.** Le stock est géré par **déclinaison** : un produit (ex. « Nike Air Force 1 ») a plusieurs déclinaisons (pointure 42 / blanc, pointure 43 / noir…), chacune avec sa propre quantité.
- **R2.** Stock **disponible** = stock physique − paires réservées (réservations actives) − paires de commandes en attente de préparation.
- **R3.** Une commande, une réservation ou une vente est **refusée** si le stock disponible est insuffisant (le contrôle se fait côté serveur, dans une transaction, pour éviter de vendre deux fois la même paire).
- **R4.** Une **alerte de stock bas** apparaît quand le stock disponible d'une déclinaison passe sous un seuil (3 paires par défaut, modifiable par produit).

### Commandes

- **R5.** Statuts : `EN_ATTENTE → CONFIRMEE → EN_PREPARATION → EXPEDIEE (livraison) ou PRETE (retrait) → LIVREE`. Une commande peut être `ANNULEE` tant qu'elle n'est pas expédiée ou prête.
- **R6.** Le stock physique diminue au passage `EN_PREPARATION` ; une annulation avant ce statut libère simplement la quantité retenue.
- **R7.** Le **prix est figé** dans la commande au moment de la validation (un changement de prix ultérieur ne modifie pas les commandes passées).
- **R8.** Frais de livraison selon la destination choisie dans une liste : Douala 1 000 XAF ; autres villes du Cameroun 10 % du montant des chaussures (10 000 XAF → 1 000 XAF) ; étranger (Gabon, Tchad, Guinée) 20 % du montant, **à partir de 5 paires** ; **10 % de réduction** sur la livraison à partir de 10 paires ; retrait en boutique gratuit.

### Réservations

- **R9.** Une réservation porte sur **une** déclinaison (une paire) et bloque la paire pendant **48 heures**.
- **R10.** Un client a au maximum **3 réservations actives**.
- **R11.** Une réservation non honorée **expire automatiquement** après 48 h (tâche planifiée) ; la paire redevient disponible.
- **R12.** Statuts : `ACTIVE → HONOREE` (achat en boutique) ou `ANNULEE` (par le client ou la boutique) ou `EXPIREE`.

### Fidélité

- **R13.** Le client gagne **1 point par tranche de 1 000 XAF** dépensés (commandes livrées et achats en boutique liés à son compte).

### Sécurité et accès

- **R14.** Authentification par **jeton JWT** ; mots de passe hachés (algorithme par défaut de Django : PBKDF2).
- **R15.** Un client ne voit que **ses** commandes et réservations ; seuls le gérant et les vendeurs accèdent à l'espace de gestion ; seul le gérant gère les produits, les catégories, le stock et l'équipe.

## 6. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| Sécurité | API protégée (JWT), droits vérifiés côté serveur sur chaque route, validation de toutes les données, CORS limité au frontend |
| Qualité | Développement en **TDD** (tests écrits avant le code) ; tests exécutés automatiquement à chaque envoi sur GitHub (GitHub Actions) |
| Performance | Catalogue paginé (20 produits par page) ; images optimisées |
| Accessibilité | Navigation au clavier, contrastes suffisants, textes alternatifs |
| Portabilité | Environnement complet lancé avec **Docker** (`docker compose up`) |
| Maintenabilité | Code organisé par application Django ; API documentée automatiquement (OpenAPI / Swagger) |

## 7. Contraintes techniques

Python, Django, Django REST Framework, React.js, PostgreSQL, Docker, GitHub, API REST, TDD, Scrum, Kanban.

## 8. Livrables

1. Ce cahier des charges, les user stories, le modèle de données et l'architecture (dossier `docs/`) ;
2. Le code source (API Django + application React) avec ses tests ;
3. L'environnement Docker ;
4. L'application déployée en ligne, avec un compte de démonstration ;
5. Un README complet (installation, captures, choix techniques).
