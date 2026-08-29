-- Commande en invité, paramètres de boutique, bannières éditoriales,
-- suppression du module d'avis produits et fermeture des moyens de paiement
-- non ouverts à la vente.

-- 1. Avis produits : hors périmètre (recueil de besoins). La table et son enum
--    disparaissent ; les fiches produit ne portent plus de note.
DROP TABLE IF EXISTS "Review";
DROP TYPE IF EXISTS "ReviewStatus";

ALTER TABLE "Product" DROP COLUMN IF EXISTS "rating";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "reviewsCount";

-- 2. Un seul moyen d'encaissement : à la livraison. Les valeurs jamais ouvertes
--    quittent l'enum pour qu'aucune interface ne puisse les proposer.
UPDATE "Order" SET "method" = 'COD' WHERE "method" <> 'COD';

ALTER TYPE "PayMethod" RENAME TO "PayMethod_old";
CREATE TYPE "PayMethod" AS ENUM ('COD');
ALTER TABLE "Order" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "method" TYPE "PayMethod" USING ("method"::text::"PayMethod");
ALTER TABLE "Order" ALTER COLUMN "method" SET DEFAULT 'COD';
DROP TYPE "PayMethod_old";

-- 3. Commande sans compte : jeton de lecture remis à l'acheteuse.
--    Les commandes déjà enregistrées en reçoivent un, sinon la colonne ne
--    pourrait pas devenir obligatoire.
ALTER TABLE "Order" ADD COLUMN "publicToken" TEXT;
UPDATE "Order" SET "publicToken" = gen_random_uuid()::text WHERE "publicToken" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");

-- 4. Bannières : de quoi piloter le carrousel d'accueil depuis le back-office.
ALTER TABLE "Banner" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "Banner" ADD COLUMN "text" TEXT;
ALTER TABLE "Banner" ADD COLUMN "ctaLabel" TEXT;
ALTER TABLE "Banner" ADD COLUMN "ctaHref" TEXT;
ALTER TABLE "Banner" ADD COLUMN "focus" TEXT NOT NULL DEFAULT 'center';
ALTER TABLE "Banner" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Banner_slot_active_position_idx" ON "Banner"("slot", "active", "position");

-- 5. Paramètres de la boutique : une seule ligne, identifiant figé.
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'shop',
    "shopName" TEXT NOT NULL DEFAULT 'HUWSTORE',
    "phone" TEXT NOT NULL DEFAULT '709666259',
    "whatsapp" TEXT NOT NULL DEFAULT '221709666259',
    "email" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Dakar',
    "country" TEXT NOT NULL DEFAULT 'Senegal',
    "addressLine" TEXT,
    "ninea" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "tiktokUrl" TEXT,
    "announcement" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
