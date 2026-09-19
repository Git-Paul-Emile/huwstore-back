-- Le paiement en especes a la livraison depend de la zone, pas d'une
-- comparaison de texte sur son nom (aucune zone ne s'appelle "Dakar" : ce
-- sont des quartiers). "codEligible" porte cette regle en donnee.
ALTER TABLE "DeliveryZone" ADD COLUMN "codEligible" BOOLEAN NOT NULL DEFAULT false;

-- Fige a l'instant de l'achat, comme le reste des coordonnees de commande.
ALTER TABLE "Order" ADD COLUMN "codEligible" BOOLEAN NOT NULL DEFAULT false;

-- Donnees existantes : avant ce jour, un seul moyen existait (COD = paiement
-- a la livraison), toujours non bloquant. Les commandes deja passees dans ce
-- mode gardent donc ce statut.
UPDATE "Order" SET "codEligible" = true WHERE "method" = 'COD';
