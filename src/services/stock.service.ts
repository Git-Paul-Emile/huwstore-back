import { stockRepository } from "../repositories/stock.repository.js";
import { AppError } from "../utils/AppError.js";
import { stockMoveTypeMap } from "../utils/enumMaps.js";
import type { stockAdjustSchema } from "../validators/stock.validator.js";
import type { z } from "zod";

export const stockService = {
  async listStock() {
    const rows = await stockRepository.findAllStock();
    return rows.map((row) => ({
      variantId: row.variantId,
      sku: row.variant.sku,
      productId: row.variant.product.id,
      product: row.variant.product.name,
      color: row.variant.colorName,
      qty: row.qty,
      threshold: row.threshold,
      low: row.qty <= row.threshold,
    }));
  },

  async listMovements() {
    const rows = await stockRepository.findMovements();
    return rows.map((movement) => ({
      id: movement.id,
      variantId: movement.variantId,
      product: movement.variant.product.name,
      color: movement.variant.colorName,
      type: stockMoveTypeMap.label(movement.type),
      qty: movement.qty,
      reason: movement.reason,
      author: movement.author,
      date: movement.createdAt,
    }));
  },

  async adjust(input: z.infer<typeof stockAdjustSchema>) {
    const variant = await stockRepository.findVariantById(input.variantId);
    if (!variant) throw AppError.notFound("Déclinaison introuvable.");

    // Un stock ne peut pas devenir négatif : on refuse plutôt que de laisser
    // la base enregistrer un état impossible.
    const current = variant.stock?.qty ?? 0;
    if (current + input.qty < 0) {
      throw AppError.badRequest(`Stock insuffisant : ${current} en stock, retrait de ${Math.abs(input.qty)} demandé.`);
    }

    const { movement, stock } = await stockRepository.applyMovement(
      {
        variantId: input.variantId,
        type: stockMoveTypeMap.fromLabel(input.type),
        qty: input.qty,
        reason: input.reason,
        author: input.author,
      },
      variant.stock?.threshold ?? 5,
    );

    return {
      id: movement.id,
      variantId: input.variantId,
      product: variant.product.name,
      color: variant.colorName,
      type: input.type,
      qty: input.qty,
      reason: input.reason,
      author: input.author,
      newQty: stock.qty,
    };
  },
};
