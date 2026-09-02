import { z } from "zod";

/**
 * `role` et `avatar` ne sont plus affiches par la vitrine ni demandes par le
 * back-office. Les colonnes restent en base - une migration qui les supprime
 * effacerait ce que la boutique y a deja ecrit - mais elles ne sont plus
 * exigees a la saisie.
 */
export const testimonialSchema = z.object({
  author: z.string().min(1),
  role: z.string().default(""),
  text: z.string().min(1),
  avatar: z.string().url().nullish(),
  position: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const testimonialUpdateSchema = testimonialSchema.partial();
