import { z } from "zod";
import { PAY_METHODS_OFFERTS } from "../utils/enumMaps.js";
import { emailSchema, phoneSchema } from "./common.js";

export { phoneSchema };

const orderStatusLabel = z.enum(["En préparation", "Expédiée", "En cours de livraison", "Livrée", "Retournée"]);
const payStatusLabel = z.enum(["Payé", "En attente", "Échoué"]);

export const orderCreateSchema = z.object({
  client: z.string().trim().min(2, "Le nom complet est requis."),
  phone: phoneSchema,
  email: emailSchema.optional(),
  addressLine: z.string().trim().min(5, "L'adresse de livraison est requise."),
  landmark: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1),
  country: z.string().trim().min(1),
  deliveryMode: z.enum(["Domicile", "Point relais"]).default("Domicile"),
  /** Facultatif : sans zone connue, les frais de port sont a 0 et l'admin tranche. */
  deliveryZoneId: z.string().trim().min(1).optional(),
  /** Un seul moyen ouvert aujourd'hui : le paiement a la livraison. */
  method: z.enum(PAY_METHODS_OFFERTS).default("Paiement à la livraison"),
  promoCode: z.string().trim().min(1).max(40).optional(),
  note: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        /** On commande une DÉCLINAISON (un coloris précis), pas un produit abstrait. */
        variantId: z.string().min(1),
        qty: z.number().int().positive().max(50),
      }),
    )
    .min(1, "La commande doit contenir au moins un article."),
});

export const orderUpdateSchema = z
  .object({
    status: orderStatusLabel.optional(),
    pay: payStatusLabel.optional(),
    courier: z.string().nullable().optional(),
    tracking: z.string().nullable().optional(),
  })
  .strict();

export const orderListQuerySchema = z.object({
  status: orderStatusLabel.optional(),
  pay: payStatusLabel.optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(["recent", "oldest", "total-desc", "total-asc"]).default("recent"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
