6. Database Schema Professionnel — Crusty’s Express
6.1 Vision Architecture Database

La base de données de Crusty’s Express doit être :

Structurée et normalisée
Rapide et scalable
Sécurisée
Facile à maintenir
Compatible avec une évolution SaaS/mobile
Optimisée pour les performances backend
Technologie recommandée
PostgreSQL (recommandé pour scalabilité et robustesse)
OU
MySQL
6.2 Architecture Générale
Modules principaux
Users & Auth
│
├── users
├── admins
├── roles
└── sessions

Restaurant
│
├── categories
├── products
├── product_images
└── product_variants

Orders
│
├── orders
├── order_items
├── payments
└── order_status_history

Reservations
│
├── reservations
└── reservation_tables

Website CMS
│
├── testimonials
├── gallery
├── contacts
└── site_contents

Analytics
│
├── activity_logs
└── statistics
6.3 Database Relations (Vue Globale)
users
 ├── orders
 ├── reservations
 └── testimonials

categories
 └── products

products
 ├── product_images
 └── order_items

orders
 ├── order_items
 ├── payments
 └── order_status_history

admins
 └── activity_logs
6.4 Tables Professionnelles
1. users

Gestion des clients.

Champ	Type	Description
id	UUID	Primary Key
full_name	VARCHAR(120)	Nom complet
email	VARCHAR(120)	Unique
phone	VARCHAR(20)	Téléphone
password	TEXT	Password hash
avatar	TEXT	Photo profil
is_verified	BOOLEAN	Vérification email
created_at	TIMESTAMP	Création
updated_at	TIMESTAMP	Mise à jour
2. admins

Gestion des administrateurs.

Champ	Type
id	UUID
full_name	VARCHAR(120)
email	VARCHAR(120)
password	TEXT
role_id	UUID
created_at	TIMESTAMP
3. roles

Gestion des permissions.

Champ	Type
id	UUID
name	VARCHAR(50)
permissions	JSONB
Exemples rôles
Super Admin
Manager
Content Manager
Staff
4. categories

Catégories des produits.

Champ	Type
id	UUID
name	VARCHAR(80)
slug	VARCHAR(100)
image	TEXT
description	TEXT
is_active	BOOLEAN
created_at	TIMESTAMP
Exemple
Burgers
Poutines
Sandwiches
Drinks
Desserts
5. products

Produits du menu.

Champ	Type
id	UUID
category_id	UUID
name	VARCHAR(120)
slug	VARCHAR(120)
description	TEXT
price	DECIMAL(10,2)
discount_price	DECIMAL(10,2)
stock_quantity	INTEGER
calories	INTEGER
image	TEXT
is_featured	BOOLEAN
is_available	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
6. product_images

Images multiples des produits.

Champ	Type
id	UUID
product_id	UUID
image_url	TEXT
created_at	TIMESTAMP
7. reservations

Gestion des réservations.

Champ	Type
id	UUID
user_id	UUID
customer_name	VARCHAR(120)
phone	VARCHAR(20)
email	VARCHAR(120)
reservation_date	DATE
reservation_time	TIME
guests_count	INTEGER
special_request	TEXT
status	VARCHAR(30)
created_at	TIMESTAMP
Statuts possibles
pending
confirmed
cancelled
completed
8. orders

Gestion des commandes.

Champ	Type
id	UUID
user_id	UUID
order_number	VARCHAR(50)
total_price	DECIMAL(10,2)
delivery_type	VARCHAR(30)
payment_status	VARCHAR(30)
order_status	VARCHAR(30)
customer_address	TEXT
customer_phone	VARCHAR(20)
notes	TEXT
created_at	TIMESTAMP
Types livraison
delivery
pickup
dine_in
Statuts commande
pending
preparing
on_the_way
delivered
cancelled
9. order_items

Produits d’une commande.

Champ	Type
id	UUID
order_id	UUID
product_id	UUID
quantity	INTEGER
unit_price	DECIMAL(10,2)
subtotal	DECIMAL(10,2)
10. payments

Gestion des paiements.

Champ	Type
id	UUID
order_id	UUID
payment_method	VARCHAR(50)
transaction_id	VARCHAR(255)
amount	DECIMAL(10,2)
payment_status	VARCHAR(30)
paid_at	TIMESTAMP
Méthodes futures
Cash
Card
Stripe
PayPal
11. testimonials

Avis clients.

Champ	Type
id	UUID
user_id	UUID
customer_name	VARCHAR(120)
rating	INTEGER
message	TEXT
is_approved	BOOLEAN
created_at	TIMESTAMP
12. gallery

Galerie du restaurant.

Champ	Type
id	UUID
title	VARCHAR(120)
image_url	TEXT
category	VARCHAR(50)
created_at	TIMESTAMP
13. contacts

Messages formulaire contact.

Champ	Type
id	UUID
full_name	VARCHAR(120)
email	VARCHAR(120)
subject	VARCHAR(150)
message	TEXT
is_read	BOOLEAN
created_at	TIMESTAMP
14. activity_logs

Logs administrateurs.

Champ	Type
id	UUID
admin_id	UUID
action	VARCHAR(255)
ip_address	VARCHAR(100)
created_at	TIMESTAMP
15. site_contents

Mini CMS dynamique.

Champ	Type
id	UUID
section_key	VARCHAR(100)
title	VARCHAR(255)
content	TEXT
image_url	TEXT
updated_at	TIMESTAMP
6.5 Relations SQL Professionnelles
Relations principales
products.category_id
→ categories.id

orders.user_id
→ users.id

order_items.order_id
→ orders.id

order_items.product_id
→ products.id

payments.order_id
→ orders.id

reservations.user_id
→ users.id

admins.role_id
→ roles.id
6.6 Standards Professionnels
Convention Naming
Tables
snake_case
plural_names
Colonnes
snake_case
6.7 Sécurité Database
Bonnes pratiques
Password hashing avec bcrypt
Prepared statements
Validation backend obligatoire
Soft delete pour données sensibles
Audit logs administrateurs
Rate limiting API
Encryption des données critiques
6.8 Optimisation Performance
Index importants
INDEX users_email_index
INDEX products_category_index
INDEX orders_user_index
INDEX reservations_date_index
INDEX products_slug_index
6.9 Évolutions Futures
Scalabilité prévue
Possibilités futures
Multi-restaurants
Multi-langues
Programme fidélité
Coupons & promotions
Livraison temps réel
Notifications push
Mobile app
Analytics avancés
AI recommendations
6.10 Architecture Finale Recommandée
Stack Backend + Database
Backend
Laravel
OU
Express.js
Database
PostgreSQL
ORM recommandé
Laravel → Eloquent ORM
Node.js → Prisma ORM
6.11 Recommandation Professionnelle Finale

Pour un projet moderne, scalable et professionnel :

Architecture recommandée
Frontend:
Next.js + Tailwind CSS

Backend:
Node.js + Express.js

Database:
PostgreSQL

ORM:
Prisma

Authentication:
JWT + Refresh Tokens

Hosting:
Vercel + Railway/Supabase

Cette architecture est excellente pour :

Performance moderne
Scalabilité startup
API robuste
Déploiement rapide
Maintenance propre
Future application mobile
SaaS evolution possible