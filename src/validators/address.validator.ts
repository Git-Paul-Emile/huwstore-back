import { z } from "zod";
import { phoneSchema } from "./common.js";

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Donnez un nom à cette adresse (Domicile, Bureau…).").max(40),
  fullName: z.string().trim().min(2, "Le nom du destinataire est requis.").max(80),
  phone: phoneSchema,
  line: z.string().trim().min(5, "L'adresse est requise.").max(200),
  landmark: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1, "La ville est requise.").max(80),
  country: z.string().trim().min(1).max(80).default("Sénégal"),
  isDefault: z.boolean().default(false),
});

export const addressUpdateSchema = addressSchema.partial();
