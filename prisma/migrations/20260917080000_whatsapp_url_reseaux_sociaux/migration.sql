-- Lien du bouton WhatsApp affiche dans les reseaux sociaux du pied de page,
-- distinct du numero deja stocke dans "whatsapp" (utilise par le widget de
-- discussion flottant).
ALTER TABLE "Setting" ADD COLUMN "whatsappUrl" TEXT;
