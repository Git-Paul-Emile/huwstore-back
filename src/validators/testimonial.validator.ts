import { z } from "zod";

export const testimonialSchema = z.object({
  author: z.string().min(1),
  role: z.string().min(1),
  text: z.string().min(1),
  avatar: z.string().url().nullish(),
  position: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const testimonialUpdateSchema = testimonialSchema.partial();
