-- Retrait du cadrage de la photo d'une campagne.
--
-- Le bandeau affiche desormais la photo en object-cover centre, sans reglage
-- de point d'interet : la colonne "focus" n'a plus d'usage.

-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "focus";
