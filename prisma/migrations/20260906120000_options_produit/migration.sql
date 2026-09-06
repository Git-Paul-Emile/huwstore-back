-- Deux listes de valeurs proposees a la saisie d'un produit (matiere, fermeture),
-- gerees depuis le back-office. Le produit garde la valeur choisie en texte :
-- retirer ou renommer une option ne touche jamais aux fiches existantes.

-- CreateEnum
CREATE TYPE "ProductOptionKind" AS ENUM ('MATIERE', 'FERMETURE');

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "kind" "ProductOptionKind" NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOption_kind_position_idx" ON "ProductOption"("kind", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_kind_label_key" ON "ProductOption"("kind", "label");
