# HUWSTORE — API

API REST Express + Prisma (PostgreSQL). Ce document couvre le catalogue, les
médias et la procédure de migration.

## Démarrage

```bash
npm install
npx prisma generate     # génère le client Prisma à partir de prisma/schema.prisma
npx prisma migrate dev  # crée / applique les migrations
npm run seed            # écrit le catalogue en base
npm run dev             # API sur http://localhost:8000
```

## Modèle de données du catalogue

Trois niveaux, chacun avec une responsabilité unique :

```
Product          la fiche produit : nom, description, prix, matière,
  │              dimensions, entretien — ce qui ne dépend pas du coloris
  ├── ProductVariant   une déclinaison couleur = l'unité réellement vendue
  │     ├── Stock            quantité et seuil d'alerte, par coloris
  │     └── StockMovement    historique des entrées / sorties, par coloris
  └── ProductImage     galerie ordonnée ; variantId renseigné = photo propre
                       à un coloris, variantId à null = visuel commun
```

Conséquences pratiques :

- Le **stock est tenu au coloris**, jamais au produit. Un produit est en rupture
  seulement quand aucune de ses déclinaisons n'est disponible ; l'API expose
  quand même un stock agrégé au niveau produit, calculé à la volée.
- Une **commande porte un `variantId`**. `OrderItem` fige le nom, le coloris et
  le prix au moment de l'achat : une hausse de tarif ne réécrit pas l'historique.
- Rien n'est jamais supprimé du catalogue : produits et déclinaisons retirés
  passent à `active: false`, pour que les commandes passées restent lisibles.

Les longueurs sont stockées en **millimètres** et les poids en **grammes**, en
entiers. L'affichage en centimètres se fait côté front (`cm()` dans `data.ts`).

## Où se trouve le catalogue

| Fichier                       | Rôle                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `prisma/catalog.ts`           | les produits réels, en données pures — c'est **ici** qu'on ajoute ou corrige un article |
| `prisma/media.ts`             | résolution des URLs d'images (Cloudinary ou fichiers locaux)                            |
| `prisma/seed.ts`              | écrit `catalog.ts` en base ; idempotent, relançable sans risque                         |
| `scripts/media-manifest.json` | quelle photo source appartient à quel produit et à quel coloris                         |
| `scripts/upload-media.ts`     | envoie les images sur Cloudinary                                                        |

### Ajouter un produit

1. Déposer les photos dans `front/public/products/<slug>/`, nommées
   `<coloris>-1.jpg`, `<coloris>-2.jpg`, … et `generic-1.jpg` pour les visuels
   communs (packshot, fiche technique).
2. Ajouter l'objet correspondant dans `prisma/catalog.ts`.
3. `npm run media:upload` puis `npm run seed`.

## Médias

Deux sources possibles, résolues par `prisma/media.ts` :

1. **Cloudinary** — dès que `npm run media:upload` a tourné, les URLs sont lues
   dans `prisma/media.generated.json`. C'est le mode de production.
2. **Repli local** — sinon, les images sont servies par le front depuis
   `front/public/products/`. Le site fonctionne donc avant tout upload.

L'upload est idempotent : le `public_id` est déterministe
(`huwstore/products/<slug>/<coloris>-<n>`), relancer le script remplace l'asset
au lieu d'en créer un doublon.

Prérequis : `CLOUDINARY_URL` dans `.env`.

## Migration depuis l'ancien schéma

L'ancien modèle avait un seul coloris et une seule image par produit. La montée
en variantes déplace le stock et supprime des colonnes : Prisma proposera donc
une migration destructive. Comme le catalogue est entièrement reconstruit par le
seed, le plus simple est de repartir propre :

```bash
npx prisma migrate reset      # efface, rejoue les migrations, relance le seed
```

Si la base contient des commandes à conserver, générer plutôt la migration et
relire le SQL avant de l'appliquer :

```bash
npx prisma migrate dev --create-only --name variantes_produit
# relire prisma/migrations/<...>/migration.sql, puis :
npx prisma migrate dev
```

## API produits

`GET /products` accepte filtres, recherche, tri et pagination :

| Paramètre               | Valeurs                                              | Effet                                       |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `category`              | nom ou slug                                          | filtre par catégorie                        |
| `material`              | libellé exact                                        | filtre par matière                          |
| `color`                 | nom ou slug de coloris                               | produits ayant cette déclinaison            |
| `minPrice` / `maxPrice` | entier FCFA                                          | fourchette de prix                          |
| `search`                | texte libre                                          | nom, description, matière, collection       |
| `sort`                  | `featured`, `best`, `price-asc`, `price-desc`, `new` | tri (`best` = quantités réellement vendues) |
| `page` / `limit`        | entiers (`limit` ≤ 100)                              | pagination                                  |
| `all`                   | `true`                                               | inclut les produits désactivés (admin)      |

La réponse suit l'enveloppe commune, la pagination vivant dans `meta` :

```json
{ "status": "success", "message": "…", "data": [ … ], "meta": { "page": 1, "totalPages": 1, … } }
```

`GET /products/facets` renvoie les matières et coloris réellement présents au
catalogue — les filtres du front s'y alimentent au lieu d'être codés en dur.

`GET /products/:idOrSlug` accepte indifféremment l'identifiant ou le slug.

---

## Mise à jour du 27 août 2026 — tunnel de commande

Le schéma de données a changé (commande enrichie, carnet d'adresses, favoris
serveur). Après un `git pull`, il faut regénérer le client Prisma et la base :

```bash
npm install
npx prisma generate

# Base de développement : les commandes existantes sont des jeux de démonstration,
# et Order gagne des colonnes obligatoires (phone, addressLine, subtotal).
# On repart donc d'une base propre plutôt que de bricoler un backfill.
npx prisma migrate reset
npm run seed
```

En production, sur une base contenant de vraies commandes, ne PAS faire de reset :
écrire une migration qui ajoute les colonnes en `NULL`, remplit les valeurs
existantes (`subtotal = total`, `shippingFee = 0`, `discount = 0`, téléphone
récupéré depuis `User`), puis passe les colonnes en `NOT NULL`.

### Nouvelles variables d'environnement

| Variable           | Rôle                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `SHOP_ADMIN_EMAIL` | Destinataire des notifications de commande. Sans elle, aucune notification n'est envoyée (un avertissement est journalisé). |
| `SITE_URL`         | URL publique, utilisée dans les liens des e-mails.                                                                          |

`RESEND_API_KEY` était déjà présente mais n'était utilisée nulle part : elle
sert désormais réellement.

### Nouvelles routes

| Méthode                       | Route                         | Accès                                                                        |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `GET`                         | `/orders/:id`                 | Public — une commande rattachée à un compte n'est lisible que par ce compte. |
| `GET`                         | `/orders/export`              | Admin — export CSV des commandes filtrées.                                   |
| `POST`                        | `/promos/validate`            | Public — vérifie un code contre un panier réel, sans rien écrire.            |
| `GET`                         | `/promos`                     | **Admin** (était public : tous les codes actifs étaient listables).          |
| `GET` `POST` `PATCH` `DELETE` | `/addresses`                  | Client connecté — carnet d'adresses.                                         |
| `GET` `POST` `DELETE`         | `/wishlist`                   | Client connecté — favoris rattachés au compte.                               |
| `GET`                         | `/reviews/product/:productId` | Public — avis publiés d'un produit.                                          |
| `GET`                         | `/reviews/mine`               | Client connecté.                                                             |
| `GET`                         | `/stats/top-products`         | Admin — sacs les plus vendus (quantités réelles).                            |

### Règle de calcul des montants

Le navigateur n'envoie **jamais** de montant. `POST /orders` reçoit des
identifiants de déclinaison, des quantités, une zone et éventuellement un code
promo ; `services/pricing.service.ts` recalcule sous-total, frais de port et
remise, et c'est ce résultat qui est enregistré. Le même service sert à
`POST /promos/validate`, donc l'aperçu du panier et la vente ne peuvent pas
diverger.

---

## Mise a jour du 28 aout 2026 - securite, commande invite, facture

Cette version ferme les ecarts releves face au recueil de besoins et aux regles
du dossier `rules/`. Elle contient une migration et deux nouvelles variables
d'environnement.

### Ce qui change en base

```bash
npm install
npx prisma generate
npx prisma migrate dev        # applique 20260828120000_commande_invite_parametres_facture
npm run seed                  # compte admin + parametres + bannieres par defaut
npm run db:purge-demo         # retire les fausses clientes et commandes des anciens seeds
```

La migration :

- supprime la table `Review` et les colonnes `Product.rating` / `reviewsCount`
  (les avis produits sont hors perimetre - le recueil repond « non ») ;
- reduit l'enum `PayMethod` a `COD` : la boutique encaisse a la livraison, et
  rien d'autre. Un moyen de paiement present en base finit toujours par etre
  propose par une interface ;
- ajoute `Order.publicToken`, le jeton de lecture d'une commande passee **sans
  compte** ;
- enrichit `Banner` (sous-titre, texte, bouton, cadrage, ordre) : le carrousel
  d'accueil est desormais pilote depuis le back-office ;
- cree `Setting`, la configuration de la boutique (nom, telephone, WhatsApp,
  reseaux, bandeau d'annonce, NINEA), lue par la vitrine et par la facture.

### Securite

| Regle (`rules/security.md`) | Mise en oeuvre                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limiting               | `middlewares/rateLimit.ts` - 600 requetes / 15 min en general, 10 tentatives de connexion echouees / 15 min, 60 ecritures publiques / h. |
| En-tetes de securite        | `helmet` dans `config/app.ts`.                                                                                                           |
| JWT avec refresh token      | `POST /auth/refresh` : le jeton d'acces vit 15 min, le cookie de rafraichissement 30 jours et tourne a chaque appel.                     |
| Cookies HttpOnly            | Le refresh token n'est jamais lisible par le JavaScript. Le front garde le jeton d'acces **en memoire**, plus dans `localStorage`.       |
| Protection CSRF             | Double envoi (`mw-csrf` + en-tete `X-CSRF-Token`) sur les seules routes authentifiees par cookie.                                        |
| Moindre privilege           | Le back-office est garde cote serveur (`requireAdmin`) **et** cote ecran (`RequireAdmin`).                                               |

### Observabilite

`config/logger.ts` remplace tous les `console.log` : journal structure, niveaux,
masquage des secrets. `middlewares/requestLogger.ts` mesure chaque requete
(methode, route, code, duree) et pose un `X-Request-Id` renvoye au client.
`/health` verifie aussi la base.

### API

- Base versionnee : **`/api/v1`**. L'ancienne base `/api` redirige en 308.
- Documentation OpenAPI : **`/api/v1/docs`** (page lisible) et
  `/api/v1/docs/openapi.json` (importable dans Postman).
- Les erreurs de validation Zod renvoient desormais une **400** detaillee par
  champ, plus une 500.

### Nouvelles routes

| Methode       | Route                   | Acces                                                 |
| ------------- | ----------------------- | ----------------------------------------------------- |
| `POST`        | `/auth/refresh`         | Cookie + jeton anti-CSRF.                             |
| `PATCH`       | `/auth/me`              | Client connecte - nom, e-mail, mot de passe.          |
| `POST`        | `/orders`               | **Public** - commander sans compte est possible.      |
| `GET`         | `/orders/:id?token=...` | Acheteuse connectee, ou porteuse du jeton de lecture. |
| `GET`         | `/orders/:id/invoice`   | Facture PDF, meme controle d'acces.                   |
| `GET` `PATCH` | `/settings`             | Lecture publique, ecriture admin.                     |
| `POST`        | `/media`                | Admin - televersement d'image vers Cloudinary.        |
| `GET`         | `/clients/export`       | Admin - export CSV du fichier clientes.               |
| `GET`         | `/stock/export`         | Admin - export CSV de l'inventaire.                   |

### Facture

`services/invoice.service.ts` genere un PDF A4 a partir des montants **figes**
de la commande (elle ne recalcule rien). Tant qu'aucun NINEA n'est renseigne
dans les parametres, la facture porte la mention « TVA non applicable » ; des
qu'il l'est, il s'imprime a la place.

Le PDF est ecrit par `utils/pdf.ts`, un generateur minimal sans dependance :
une page, deux polices standard, pas de bibliotheque de mise en page a auditer.
Le jour ou la facture devient un document complexe, c'est ce seul fichier qu'on
remplace par pdfkit.

### Tests

```bash
npm test          # lanceur de tests natif de Node, aucune dependance
npm run test:watch
```

51 tests couvrent la logique qui coute cher a se tromper : calcul des frais de
port et des remises, validite des codes promo, validation des commandes,
normalisation des numeros de telephone, generation du CSV et de la facture.

### Variables d'environnement ajoutees

| Variable         | Role                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `NODE_ENV`       | `production` active les cookies `Secure`/`SameSite=None`, les journaux JSON et masque les traces. |
| `ADMIN_PASSWORD` | Mot de passe du compte administrateur cree par `npm run seed`. Obligatoire en production.         |
| `LOG_LEVEL`      | `debug`, `info`, `warn` ou `error`.                                                               |

---

## Mise à jour du 29 août 2026 — résilience, file de tâches, adaptateurs, SEO

Cette version ferme les derniers écarts face au dossier `rules/` (hors CI/CD). Pas
de migration, pas de dépendance d'infrastructure nouvelle.

### Services externes derrière un port (`rules/external-services.md`)

Le code métier ne connaît plus ni Resend ni Cloudinary, seulement deux
interfaces :

| Port                               | Adaptateurs                                  | Utilisé par     |
| ---------------------------------- | -------------------------------------------- | --------------- |
| `services/external/mailer.ts`      | `ResendMailer`, `LogMailer` (repli sans clé) | `mail.service`  |
| `services/external/image-store.ts` | `CloudinaryImageStore`                       | `media.service` |

Changer de fournisseur = un nouvel adaptateur, rien d'autre. `config/resend.ts`
et `config/cloudinary.ts` restent les seuls fichiers qui importent le SDK.

### Résilience des appels sortants (`rules/async.md`)

`lib/resilience.ts` : **timeout** (aucun appel externe ne bloque), **retry** à
backoff exponentiel + jitter, **circuit breaker** (on cesse d'appeler un
fournisseur tombé). Façade `resilient()`, utilisée par les adaptateurs.

### File de tâches (`rules/async.md`)

`queue/job-queue.ts` : file en mémoire, concurrence bornée, **jobs idempotents**
(clé), retry, lettre morte, métriques. Les e-mails de commande y passent
(`queue/index.ts`) au lieu de retarder la réponse HTTP. `jobQueue.drain()` est
appelé à l'arrêt (SIGTERM) pour ne pas perdre d'envoi.

> Ce n'est pas une file durable : un redémarrage perd les jobs en attente.
> Compromis assumé pour rester sans Redis ; l'API reste mono-instance.

### Performance (`rules/performance.md`)

- `middlewares/compression.ts` : Brotli/gzip des réponses, sans dépendance.
- `lib/cache.ts` : cache TTL mémoire. Les paramètres boutique sont mis en cache
  60 s (lus à chaque e-mail, facture et chargement de vitrine), invalidés à
  l'écriture.

### Observabilité (`rules/observability.md`)

`config/monitoring.ts` : point de collecte unique des exceptions — tout le code
passe par `monitoring.captureException`, jamais par le SDK directement.
**Sentry** (`@sentry/node`) est branché : l'initialisation vit dans
`src/instrument.ts`, chargé en tout premier par `index.ts` (avant Express et
Prisma) pour l'instrumentation automatique des requêtes. Sans `SENTRY_DSN` dans
l'environnement, Sentry reste éteint et seuls les journaux subsistent —
retirer la variable suffit à le désactiver en local. `monitoring.flush()` est
appelé avant chaque `process.exit()` pour ne pas perdre les derniers événements.
`/health` expose l'état de la file, des services externes et du monitoring.

### SEO (`rules/SEO.md`)

`GET /sitemap.xml` (route à la racine, hors `/api`) : plan du site généré depuis
la base — pages stables + chaque fiche produit active avec sa `lastmod`, mis en
cache 10 min. En production, le front le réécrit vers l'API (`front/vercel.json`).
`SITE_URL` doit valoir `https://huwstore.com`.

### Bug corrigé

Toute route inconnue sous `/api/v1/*` bouclait à l'infini sur la redirection de
compatibilité `/api` → `/api/v1`. `config/app.ts` laisse maintenant ces requêtes
tomber en 404.

### Tests

```bash
npm test              # 80 tests unitaires + intégration HTTP, sans dépendance
npm run test:integration   # base réelle, seulement si TEST_DATABASE_URL est défini
```

`src/http.test.ts` démarre l'app Express réelle et vérifie le contrat HTTP
(enveloppe, redirections, en-têtes, validation, auth, CSRF, compression,
sitemap). `src/order.itest.ts` prouve, contre une base jetable, que la commande
décrémente le stock dans la même transaction.

### Dépendances

`bcrypt` passe en **6.x** (retire `node-pre-gyp`/`tar` vulnérables) ; un
`overrides` force `deepmerge-ts@8` (faille via la CLI Prisma). `npm run audit` :
0 vulnérabilité. Script `audit` ajouté (`npm audit --audit-level=high`).

---

## Mise à jour du 29 août 2026 — compte obligatoire, coloris éditables, stats agrégées

Décisions produit de la cliente + correctifs relevés en revue de conformité.

### Ce qui change en base

```bash
npm install
npx prisma generate
npx prisma migrate deploy     # applique 20260829120000_commande_compte_obligatoire
```

La migration : supprime `Order.publicToken` et rend `Order.userId` **obligatoire**.
En prod, si des commandes en invité (`userId` NULL) existent encore, l'`ALTER`
échoue volontairement — les rattacher d'abord à un compte, puis rejouer.

### Commande réservée au compte

La commande en invité n'est plus ouverte (écart assumé vs recueil de besoins,
choix de la cliente pour un fichier clients complet).

| Route                 | Avant              | Après        |
| --------------------- | ------------------ | ------------ |
| `POST /orders`        | public             | `requireAuth` |
| `GET /orders/:id`     | public + `?token=` | `requireAuth`, propriétaire uniquement |
| `GET /orders/:id/invoice` | idem           | idem         |

`optionalAuth` et le jeton de lecture anonyme (`publicToken`) sont retirés.

### Nouvelle route

| Méthode | Route              | Rôle                                                                    |
| ------- | ------------------ | ---------------------------------------------------------------------- |
| `GET`   | `/stats/overview`  | Admin — nombre de commandes, CA encaissé, panier moyen, articles vendus sur `?days=` (défaut 30, max 365). Agrégé en base : juste quel que soit le volume (le back-office ne recalcule plus à partir d'une page de 25 commandes). |

### Fiche produit

`PATCH /products/:id` accepte désormais un tableau `variants` optionnel décrivant
l'**état complet** voulu des coloris : un `id` présent met à jour un coloris
existant (libellés, teintes, galerie), un `id` absent en crée un, un coloris
existant absent de la liste est **archivé** (jamais supprimé — `OrderItem` et
`StockMovement` y renvoient). Le stock reste piloté par `/stock`.

### Média : vidéo produit

`POST /media` accepte maintenant une **vidéo** (`data:video/mp4|webm`, 40 Mo max)
en plus des images (8 Mo). Le type est déduit du data URI ; Cloudinary reçoit
`resource_type: "video"`. La vidéo produit se **téléverse** depuis le
back-office comme une photo — plus d'URL saisie à la main (le front rend
`<video src>`, une URL YouTube ne fonctionnait pas). Limite de corps de requête
portée à 56 Mo **pour la seule route `/media`**.

### Transactions

`config/database.ts` expose `TX_OPTIONS` (`timeout: 20 s`) appliqué aux
transactions interactives (commande + édition produit) : la valeur Prisma par
défaut de 5 s est trop courte quand la base (Neon) et l'app sont dans des
régions différentes.
