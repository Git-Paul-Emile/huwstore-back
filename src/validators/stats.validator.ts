import { z } from "zod";

/**
 * Fenêtres d'analyse des statistiques. Bornées côté serveur : une valeur
 * absurde (`?days=99999`) est ramenée dans une plage raisonnable plutôt que de
 * lancer une agrégation sur toute l'histoire de la boutique.
 */
const days = (fallback: number) => z.coerce.number().int().positive().max(365).catch(fallback);

export const overviewQuerySchema = z.object({
  days: days(30),
});

export const topProductsQuerySchema = z.object({
  days: days(90),
  limit: z.coerce.number().int().positive().max(50).catch(8),
});
