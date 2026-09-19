-- Lien de paiement Wave affiche au paiement et sur la confirmation de
-- commande pour les zones hors Dakar.
ALTER TABLE "Setting" ADD COLUMN "wavePaymentUrl" TEXT;
