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

| Fichier | Rôle |
|---|---|
| `prisma/catalog.ts` | les produits réels, en données pures — c'est **ici** qu'on ajoute ou corrige un article |
| `prisma/media.ts` | résolution des URLs d'images (Cloudinary ou fichiers locaux) |
| `prisma/seed.ts` | écrit `catalog.ts` en base ; idempotent, relançable sans risque |
| `scripts/media-manifest.json` | quelle photo source appartient à quel produit et à quel coloris |
| `scripts/upload-media.ts` | envoie les images sur Cloudinary |

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

| Paramètre | Valeurs | Effet |
|---|---|---|
| `category` | nom ou slug | filtre par catégorie |
| `material` | libellé exact | filtre par matière |
| `color` | nom ou slug de coloris | produits ayant cette déclinaison |
| `minPrice` / `maxPrice` | entier FCFA | fourchette de prix |
| `search` | texte libre | nom, description, matière, collection |
| `sort` | `featured`, `price-asc`, `price-desc`, `new` | tri |
| `page` / `limit` | entiers (`limit` ≤ 100) | pagination |
| `all` | `true` | inclut les produits désactivés (admin) |

La réponse suit l'enveloppe commune, la pagination vivant dans `meta` :

```json
{ "status": "success", "message": "…", "data": [ … ], "meta": { "page": 1, "totalPages": 1, … } }
```

`GET /products/facets` renvoie les matières et coloris réellement présents au
catalogue — les filtres du front s'y alimentent au lieu d'être codés en dur.

`GET /products/:idOrSlug` accepte indifféremment l'identifiant ou le slug.
