import { z } from "zod";

export const productBadgeLabel = z.enum(["Nouveau", "Promo", "Rupture"]);

export const productSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  collection: z.string().min(1),
  categoryId: z.string().min(1),
  material: z.string().min(1),
  color: z.string().min(1),
  price: z.number().int().positive(),
  compareAt: z.number().int().positive().optional(),
  badge: productBadgeLabel.optional(),
  image: z.string().min(1),
  imageAlt: z.string().min(1),
  imageHover: z.string().min(1),
  active: z.boolean().default(true),
  stockQty: z.number().int().nonnegative().default(0),
  stockThreshold: z.number().int().nonnegative().default(5),
});

export const productUpdateSchema = productSchema.omit({ id: true }).partial();

export const productListQuerySchema = z.object({
  category: z.string().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["featured", "price-asc", "price-desc", "new"]).optional(),
  // Vue admin : inclut aussi les produits désactivés/archivés.
  all: z.coerce.boolean().optional(),
});
