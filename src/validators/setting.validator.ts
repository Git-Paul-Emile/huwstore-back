import { z } from "zod";
import { emailSchema } from "./common.js";

/** Chaine facultative : une chaine vide vaut « efface la valeur ». */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional()
  .refine((value) => value == null || /^https?:\/\//.test(value), {
    message: "Lien invalide : il doit commencer par http:// ou https://.",
  });

export const settingUpdateSchema = z
  .object({
    shopName: z.string().trim().min(1, "Le nom de la boutique est requis.").max(60).optional(),
    phone: z.string().trim().min(6, "Numéro de téléphone requis.").max(20).optional(),
    whatsapp: z
      .string()
      .trim()
      .transform((value) => value.replace(/[^\d]/g, ""))
      .refine((value) => value.length >= 8, { message: "Numéro WhatsApp au format international, ex. 221709666259." })
      .optional(),
    email: emailSchema.nullable().optional(),
    city: z.string().trim().min(1).max(60).optional(),
    country: z.string().trim().min(1).max(60).optional(),
    addressLine: optionalText(160),
    ninea: optionalText(40),
    instagramUrl: optionalUrl,
    facebookUrl: optionalUrl,
    tiktokUrl: optionalUrl,
    announcement: optionalText(160),
  })
  .strict();
