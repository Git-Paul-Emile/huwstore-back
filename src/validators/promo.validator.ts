import { z } from "zod";

export const promoSchema = z.object({
  code: z.string().min(1),
  type: z.enum(["Pourcentage", "Montant fixe", "Livraison offerte"]),
  value: z.number().int().nonnegative(),
  minCart: z.number().int().nonnegative().default(0),
  limit: z.number().int().positive(),
  end: z.coerce.date(),
  active: z.boolean().default(true),
});

export const promoUpdateSchema = promoSchema.partial();

/**
 * Verification d'un code depuis le panier. On envoie le contenu reel du panier
 * (declinaisons + quantites) et non un montant : c'est le serveur qui calcule
 * le sous-total, sinon il suffirait d'annoncer un faux montant pour debloquer
 * un code reserve aux gros paniers.
 */
export const promoValidateSchema = z.object({
  code: z.string().trim().min(1, "Saisissez un code.").max(40),
  items: z
    .array(z.object({ variantId: z.string().min(1), qty: z.number().int().positive().max(50) }))
    .min(1, "Votre panier est vide."),
  deliveryZoneId: z.string().trim().min(1).optional(),
  deliveryMode: z.enum(["Domicile", "Point relais"]).optional(),
});
