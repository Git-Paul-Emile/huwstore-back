import { z } from "zod";

// Bornes hautes défensives : contrairement au témoignage (saisi par l'admin,
// donc de confiance), ce formulaire est ouvert à n'importe quel visiteur.
export const feedbackSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().min(1).max(30).optional(),
  email: z.string().email().max(180).optional(),
  message: z.string().min(1, "Le message est requis.").max(2000),
});

export const feedbackUpdateSchema = z.object({
  read: z.boolean(),
});
