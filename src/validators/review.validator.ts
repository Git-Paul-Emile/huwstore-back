import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().min(1),
  author: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1),
});

export const reviewStatusUpdateSchema = z.object({
  status: z.enum(["En attente", "Publié", "Rejeté"]),
});
