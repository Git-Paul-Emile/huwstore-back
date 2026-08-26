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
