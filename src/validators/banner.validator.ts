import { z } from "zod";

export const bannerSchema = z.object({
  title: z.string().min(1),
  slot: z.enum(["Hero", "Bandeau promo", "Pop-up"]),
  target: z.enum(["Toutes", "Mobile", "Desktop"]).default("Toutes"),
  start: z.coerce.date(),
  end: z.coerce.date(),
  active: z.boolean().default(true),
  image: z.string().min(1),
});

export const bannerUpdateSchema = bannerSchema.partial();
