# Modèle de données — ShoeManager

Base de données **PostgreSQL**, gérée par l'ORM et les migrations de **Django**.

## Diagramme entité-association

```mermaid
erDiagram
    USER ||--o{ ORDER : "passe"
    USER ||--o{ RESERVATION : "fait"
    USER ||--o| CART : "possède"
    USER ||--o{ SALE : "enregistre (vendeur)"
    USER |o--o{ SALE : "achète (client)"

    CATEGORY |o--o{ CATEGORY : "sous-catégorie de"
    CATEGORY ||--o{ PRODUCT : "contient"
    BRAND ||--o{ PRODUCT : "fabrique"
    PRODUCT ||--o{ PRODUCT_IMAGE : "illustré par"
    PRODUCT ||--|{ VARIANT : "décliné en"
    COLOR ||--o{ VARIANT : "couleur de"

    CART ||--o{ CART_ITEM : "contient"
    VARIANT ||--o{ CART_ITEM : "ajoutée au panier"
    ORDER ||--|{ ORDER_ITEM : "contient"
    VARIANT ||--o{ ORDER_ITEM : "commandée"
    VARIANT ||--o{ RESERVATION : "réservée"
    SALE ||--|{ SALE_ITEM : "contient"
    VARIANT ||--o{ SALE_ITEM : "vendue"

    USER {
        int id PK
        string email UK
        string password "haché"
        string first_name
        string last_name
        string phone
        enum role "CLIENT, VENDEUR, GERANT"
        int loyalty_points
        bool is_active
        datetime date_joined
    }
    CATEGORY {
        int id PK
        string name
        string slug UK
        int parent_id FK "nullable"
    }
    BRAND {
        int id PK
        string name UK
    }
    COLOR {
        int id PK
        string name UK
        string hex_code
    }
    PRODUCT {
        int id PK
        string name
        string slug UK
        text description
        int category_id FK
        int brand_id FK
        decimal price "XAF"
        int low_stock_threshold "défaut 3"
        bool is_published
        datetime created_at
    }
    PRODUCT_IMAGE {
        int id PK
        int product_id FK
        string image
        int position
    }
    VARIANT {
        int id PK
        int product_id FK
        decimal size "ex. 42 ou 37.5"
        int color_id FK
        int stock "stock physique"
        string sku UK
    }
    CART {
        int id PK
        int user_id FK, UK
        datetime updated_at
    }
    CART_ITEM {
        int id PK
        int cart_id FK
        int variant_id FK
        int quantity
    }
    ORDER {
        int id PK
        string reference UK "CMD-2026-00042"
        int customer_id FK
        enum status "EN_ATTENTE ... LIVREE, ANNULEE"
        enum delivery_mode "LIVRAISON, RETRAIT"
        string delivery_address
        string delivery_zone
        decimal delivery_fee
        enum payment_method "A_LA_LIVRAISON, EN_BOUTIQUE, MOBILE_MONEY"
        bool is_paid
        decimal total
        datetime created_at
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        int variant_id FK
        int quantity
        decimal unit_price "prix figé"
    }
    RESERVATION {
        int id PK
        string reference UK
        int customer_id FK
        int variant_id FK
        enum status "ACTIVE, HONOREE, ANNULEE, EXPIREE"
        datetime created_at
        datetime expires_at "created_at + 48 h"
    }
    SALE {
        int id PK
        string reference UK "VTE-2026-00105"
        int seller_id FK
        int customer_id FK "nullable"
        int reservation_id FK "nullable"
        enum payment_method "ESPECES, MOBILE_MONEY, CARTE"
        decimal total
        datetime created_at
    }
    SALE_ITEM {
        int id PK
        int sale_id FK
        int variant_id FK
        int quantity
        decimal unit_price
    }
```

## Choix de conception

- **Déclinaison (VARIANT)** : le stock n'est pas porté par le produit mais par chaque couple pointure/couleur. Contrainte d'unicité `(product_id, size, color_id)`.
- **Stock disponible calculé** (règle R2) : `stock − réservations ACTIVE − quantités des commandes EN_ATTENTE ou CONFIRMEE`. Il n'est pas stocké, pour éviter les incohérences ; il est calculé par une requête annotée.
- **Concurrence** : la validation d'une commande, d'une réservation ou d'une vente verrouille les lignes `VARIANT` concernées (`SELECT … FOR UPDATE`) dans une transaction, pour qu'une même paire ne soit jamais vendue deux fois.
- **Prix figés** : `ORDER_ITEM.unit_price` et `SALE_ITEM.unit_price` copient le prix au moment de l'achat.
- **Références lisibles** (`CMD-2026-00042`) pour les échanges avec les clients, en plus des identifiants techniques.
- **Catégories en arbre** : une simple clé `parent_id` (deux niveaux suffisent : Hommes › Baskets).
- **Montants** en `DECIMAL(12, 0)` : le franc CFA n'a pas de centimes.
- **Un seul modèle d'utilisateur** avec un rôle, plutôt que trois tables : plus simple pour l'authentification.
