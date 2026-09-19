import { z } from "zod";

export const deliveryZoneSchema = z.object({
  city: z.string().min(1),
  country: z.string().min(1),
  fee: z.number().int().nonnegative(),
  freeFrom: z.number().int().nonnegative(),
  delay: z.string().min(1),
  relay: z.boolean().default(false),
  active: z.boolean().default(true),
  /** Espèces à la remise possible sur cette zone (Dakar et ses environs immédiats). */
  codEligible: z.boolean().default(false),
});

export const deliveryZoneUpdateSchema = deliveryZoneSchema.partial();
