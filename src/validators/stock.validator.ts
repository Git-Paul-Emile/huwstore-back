import { z } from "zod";

export const stockMoveTypeLabel = z.enum(["Entrée", "Sortie", "Ajustement", "Vente"]);

export const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  type: stockMoveTypeLabel,
  qty: z.number().int().refine((n) => n !== 0, "La quantité ne peut pas être nulle."),
  reason: z.string().min(1),
  author: z.string().min(1),
});
