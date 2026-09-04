import { z } from "zod";

/**
 * Fusion de la liste locale (visiteur non connecté) vers le compte, à la
 * connexion. La liste est plafonnée : un client ne peut pas pousser des
 * milliers d'identifiants en une requête.
 */
export const wishlistMergeSchema = z.object({
  productIds: z.array(z.string().min(1)).max(200).default([]),
});
