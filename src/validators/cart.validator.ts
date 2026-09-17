import { z } from "zod";

/** Quantité raisonnable : au-delà, c'est un usage professionnel à traiter à part. */
const qtySchema = z.number().int().min(1).max(20);

export const cartAddSchema = z.object({
  variantId: z.string().min(1),
  qty: qtySchema.default(1),
});

export const cartQtySchema = z.object({
  qty: qtySchema,
});

/**
 * Fusion du panier local (visiteuse non connectée) vers le compte, à la
 * connexion. Plafonnée : une cliente ne peut pas pousser des milliers de
 * lignes en une requête.
 */
export const cartMergeSchema = z.object({
  lines: z
    .array(z.object({ variantId: z.string().min(1), qty: qtySchema }))
    .max(100)
    .default([]),
});
