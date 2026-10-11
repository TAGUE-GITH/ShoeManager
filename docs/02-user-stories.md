# User stories — ShoeManager

Format : *En tant que [acteur], je veux [action] afin de [bénéfice].*
Chaque story a des **critères d'acceptation** : ce sont eux qui deviennent les **tests écrits avant le code** (TDD).

Estimation en points (suite de Fibonacci : 1, 2, 3, 5, 8). Priorité MoSCoW : **M** (Must), **S** (Should), **C** (Could).

---

## Épopée 1 — Comptes et sécurité

**US-01 — Inscription client** · M · 3 pts
En tant que visiteur, je veux créer un compte afin de commander et réserver.
- Email unique, mot de passe de 8 caractères minimum ;
- Le compte créé a le rôle **Client** ;
- Une erreur claire s'affiche si l'email est déjà utilisé.

**US-02 — Connexion** · M · 2 pts
En tant qu'utilisateur, je veux me connecter afin d'accéder à mon espace.
- Un jeton JWT (accès + rafraîchissement) est renvoyé si les identifiants sont corrects ;
- Message unique « email ou mot de passe incorrect » sinon (aucune indication sur l'existence du compte).

**US-03 — Mot de passe oublié** · S · 3 pts
En tant qu'utilisateur, je veux recevoir un lien pour choisir un nouveau mot de passe.
- Lien à usage unique, valable 30 minutes ;
- Même réponse que l'email existe ou non.

**US-04 — Gestion de l'équipe** · S · 3 pts
En tant que gérant, je veux créer des comptes vendeurs afin que mon équipe utilise l'application.
- Seul le gérant peut créer, désactiver ou changer le rôle d'un membre ;
- Un vendeur n'accède pas aux produits, au stock ni à l'équipe.

---

## Épopée 2 — Catalogue

**US-05 — Catégories** · M · 3 pts
En tant que gérant, je veux organiser les produits en catégories et sous-catégories (ex. Femmes › Sandales).
- Une catégorie peut avoir une catégorie parente ;
- Une catégorie qui contient des produits ne peut pas être supprimée.

**US-06 — Produits et déclinaisons** · M · 5 pts
En tant que gérant, je veux ajouter un produit avec ses pointures, couleurs, prix, photos et stock.
- Une déclinaison = pointure + couleur + quantité ; le couple pointure/couleur est unique par produit ;
- Prix en XAF, strictement positif ;
- Un produit peut être masqué de la boutique sans être supprimé.

**US-07 — Parcourir le catalogue** · M · 5 pts
En tant que visiteur, je veux parcourir les chaussures par catégorie et les filtrer.
- Filtres combinables : catégorie (sous-catégories incluses), pointure, couleur, marque, prix minimum/maximum ;
- Recherche par nom ou marque ;
- Résultats paginés (20 par page), produits masqués exclus.

**US-08 — Fiche produit** · M · 2 pts
En tant que visiteur, je veux voir les pointures et couleurs **disponibles** d'un produit.
- Une pointure épuisée est affichée mais non sélectionnable ;
- La disponibilité tient compte des réservations et commandes en cours (règle R2).

---

## Épopée 3 — Commande en ligne

**US-09 — Panier** · M · 3 pts
En tant que client, je veux ajouter des paires à mon panier.
- Impossible d'ajouter plus que le stock disponible ;
- Le panier est conservé entre deux visites.

**US-10 — Passer commande** · M · 8 pts
En tant que client, je veux valider mon panier avec livraison ou retrait en boutique.
- Le stock disponible est vérifié **au moment de la validation**, dans une transaction (R3) ;
- Les prix sont figés dans la commande (R7) ; les frais de livraison sont calculés selon la zone (R8) ;
- Paiement : à la livraison, en boutique ou Mobile Money (simulé) ;
- La commande est créée au statut `EN_ATTENTE` et un email de confirmation est envoyé.

**US-11 — Suivre mes commandes** · M · 2 pts
En tant que client, je veux voir mes commandes et leur statut.
- Un client ne voit jamais les commandes d'un autre client (réponse 404).

**US-12 — Traiter les commandes** · M · 5 pts
En tant que vendeur, je veux faire avancer le statut des commandes.
- Seules les transitions de la règle R5 sont acceptées ;
- Le stock physique diminue au passage `EN_PREPARATION` (R6) ;
- Le client reçoit un email à chaque changement de statut.

**US-13 — Annuler une commande** · S · 3 pts
En tant que client, je veux annuler une commande qui n'est pas encore préparée.
- Annulation possible aux statuts `EN_ATTENTE` et `CONFIRMEE` uniquement ;
- La quantité retenue redevient disponible.

---

## Épopée 4 — Réservations

**US-14 — Réserver une paire** · M · 5 pts
En tant que client, je veux réserver une paire pour venir l'essayer en boutique.
- La paire est bloquée 48 h (R9) ; maximum 3 réservations actives (R10) ;
- Refus si la déclinaison n'est plus disponible.

**US-15 — Expiration automatique** · M · 3 pts
En tant que gérant, je veux que les réservations non honorées expirent seules.
- Une tâche planifiée passe les réservations de plus de 48 h au statut `EXPIREE` (R11) ;
- La paire redevient disponible immédiatement.

**US-16 — Traiter les réservations** · M · 3 pts
En tant que vendeur, je veux voir les réservations du jour et les marquer honorées ou annulées.
- « Honorée » enregistre la vente en boutique et diminue le stock physique.

---

## Épopée 5 — Ventes en boutique

**US-17 — Caisse** · M · 5 pts
En tant que vendeur, je veux enregistrer une vente faite en boutique.
- Le stock physique diminue immédiatement ;
- La vente peut être liée à un client (fidélité) ou anonyme ;
- Moyens de paiement : espèces, Mobile Money, carte.

**US-18 — Reçu PDF** · S · 3 pts
En tant que vendeur, je veux imprimer ou envoyer un reçu.
- Le reçu contient : numéro, date, articles (pointure, couleur), total, moyen de paiement, nom de la boutique.

---

## Épopée 6 — Pilotage

**US-19 — Alertes de stock** · M · 2 pts
En tant que gérant, je veux voir les déclinaisons dont le stock est bas ou épuisé (R4).

**US-20 — Tableau de bord** · M · 5 pts
En tant que gérant, je veux suivre l'activité de la boutique.
- Chiffre d'affaires (jour, semaine, mois), en ligne et en boutique ;
- Meilleures ventes, pointures les plus vendues, commandes et réservations en attente.

**US-21 — Fiches clients et fidélité** · S · 3 pts
En tant que vendeur, je veux consulter l'historique d'un client et ses points de fidélité (R13).

---

## Épopée 7 — Qualité et mise en ligne

**US-22 — Compte de démonstration** · S · 3 pts
En tant que recruteur, je veux tester l'application sans créer de compte (boutique remplie de produits fictifs).

**US-23 — Français / anglais** · C · 3 pts
En tant qu'utilisateur, je veux choisir la langue de l'interface.

---

## Découpage en sprints (Scrum)

Sprints d'une semaine. Vélocité visée : environ 20 points par sprint pour l'équipe.

| Sprint | Objectif | Stories |
|---|---|---|
| **0** | Analyse, conception, environnement (Docker, CI, squelettes Django et React) | Ce dossier `docs/` |
| **1** | Comptes et catalogue consultable | US-01, US-02, US-05, US-06, US-07, US-08 |
| **2** | Commande en ligne | US-09, US-10, US-11, US-12, US-13 |
| **3** | Réservations et caisse | US-14, US-15, US-16, US-17, US-18 |
| **4** | Pilotage, finitions et mise en ligne | US-03, US-04, US-19, US-20, US-21, US-22, US-23 |

## Définition de « terminé » (Definition of Done)

Une story est terminée quand :

1. Les critères d'acceptation sont couverts par des **tests automatisés** qui passent ;
2. Le code a été relu dans une **pull request** et validé par un autre membre ;
3. Les tests passent dans **GitHub Actions** ;
4. L'interface est **responsive** et traduite ;
5. La carte est déplacée dans la colonne « Terminé » du tableau Kanban.
