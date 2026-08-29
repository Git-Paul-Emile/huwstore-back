-- Certains sacs sont livres avec une pochette assortie : un texte libre
-- affiche sur la fiche produit, pas un lot a composer par la cliente.
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "includedAccessory" TEXT;

-- Avis libre depose par une visiteuse sur le site (pas un avis produit) :
-- traite depuis le back-office, jamais publie automatiquement.

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_read_createdAt_idx" ON "Feedback"("read", "createdAt");
