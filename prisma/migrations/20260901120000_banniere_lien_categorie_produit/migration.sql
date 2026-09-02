-- Destination du bouton d'une campagne.
--
-- En plus du chemin libre (ctaHref), une campagne peut desormais pointer vers
-- une categorie ou une fiche produit. linkType tranche lequel des trois
-- s'applique ; le serveur en deduit l'URL finale renvoyee a la vitrine.
--
-- Colonnes facultatives : les campagnes deja en base gardent leur ctaHref et
-- prennent linkType = PATH par defaut. Les cibles sont en ON DELETE SET NULL :
-- supprimer une categorie ou un produit ne bloque pas, la campagne retombe
-- alors sur /boutique.

-- CreateEnum
CREATE TYPE "BannerLinkType" AS ENUM ('PATH', 'CATEGORY', 'PRODUCT');

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "linkType" "BannerLinkType" NOT NULL DEFAULT 'PATH',
ADD COLUMN     "linkCategoryId" TEXT,
ADD COLUMN     "linkProductId" TEXT;

-- CreateIndex
CREATE INDEX "Banner_linkCategoryId_idx" ON "Banner"("linkCategoryId");

-- CreateIndex
CREATE INDEX "Banner_linkProductId_idx" ON "Banner"("linkProductId");

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_linkCategoryId_fkey" FOREIGN KEY ("linkCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_linkProductId_fkey" FOREIGN KEY ("linkProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
