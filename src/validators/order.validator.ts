import { z } from "zod";

export const orderCreateSchema = z.object({
  client: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  method: z.enum(["Wave", "Orange Money", "Paiement à la livraison", "Carte"]),
  items: z
    .array(
      z.object({
        /** On commande une DÉCLINAISON (un coloris précis), pas un produit abstrait. */
        variantId: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .min(1, "La commande doit contenir au moins un article."),
});

export const orderUpdateSchema = z
  .object({
    status: z.enum(["En préparation", "Expédiée", "En cours de livraison", "Livrée", "Retournée"]).optional(),
    pay: z.enum(["Payé", "En attente", "Échoué"]).optional(),
    courier: z.string().nullable().optional(),
    tracking: z.string().nullable().optional(),
  })
  .strict();

export const orderListQuerySchema = z.object({
  status: z.enum(["En préparation", "Expédiée", "En cours de livraison", "Livrée", "Retournée"]).optional(),
  pay: z.enum(["Payé", "En attente", "Échoué"]).optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(["recent", "oldest", "total-desc", "total-asc"]).default("recent"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
