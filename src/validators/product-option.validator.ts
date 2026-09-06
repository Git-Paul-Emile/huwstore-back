import { z } from "zod";

/**
 * Deux listes de valeurs proposées à la saisie d'un produit : la matière et le
 * type de fermeture. La boutique les gère depuis le back-office ; la fiche
 * produit garde la valeur choisie en texte, pas une clé étrangère.
 */
export const PRODUCT_OPTION_KINDS = ["matiere", "fermeture"] as const;
export type ProductOptionKindLabel = (typeof PRODUCT_OPTION_KINDS)[number];

export const productOptionSchema = z.object({
  kind: z.enum(PRODUCT_OPTION_KINDS),
  label: z.string().trim().min(1, "Le libellé est requis.").max(80, "80 caractères maximum."),
  position: z.number().int().nonnegative().default(0),
});

export const productOptionUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    position: z.number().int().nonnegative().optional(),
  })
  .strict();

export const productOptionListQuerySchema = z.object({
  kind: z.enum(PRODUCT_OPTION_KINDS).optional(),
});
