-- Resume affiche sous le nom de l'univers sur la page d'accueil.
-- Colonne facultative : les categories deja en base restent valides, et la
-- vitrine retombe sur le nombre de produits tant qu'aucun resume n'est saisi.

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "description" TEXT;
