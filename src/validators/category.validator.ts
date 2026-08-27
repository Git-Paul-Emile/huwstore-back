import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  name: z.string().min(1),
  /** Optionnel : dérivé du nom quand il n'est pas fourni. */
  slug: z.string().regex(slugPattern, "Slug invalide (minuscules, chiffres et tirets).").optional(),
  image: z.string().min(1),
  position: z.number().int().nonnegative().default(0),
});

export const categoryUpdateSchema = categorySchema.partial();
