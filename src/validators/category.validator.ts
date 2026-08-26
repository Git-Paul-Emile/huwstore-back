import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
});

export const categoryUpdateSchema = categorySchema.partial();
