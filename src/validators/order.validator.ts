import { z } from "zod";

export const orderCreateSchema = z.object({
  client: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  method: z.enum(["Wave", "Orange Money", "Paiement à la livraison", "Carte"]),
  items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().positive() })).min(1),
});

export const orderUpdateSchema = z.object({
  status: z.enum(["En préparation", "Expédiée", "En cours de livraison", "Livrée", "Retournée"]).optional(),
  pay: z.enum(["Payé", "En attente", "Échoué"]).optional(),
  courier: z.string().optional(),
  tracking: z.string().optional(),
});
