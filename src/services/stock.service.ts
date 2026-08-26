import { stockRepository } from "../repositories/stock.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { AppError } from "../utils/AppError.js";
import { stockMoveTypeMap } from "../utils/enumMaps.js";
import type { stockAdjustSchema } from "../validators/stock.validator.js";
import type { z } from "zod";

export const stockService = {
  async listStock() {
    const rows = await stockRepository.findAllStock();
    return rows.map((s) => ({ productId: s.productId, product: s.product.name, qty: s.qty, threshold: s.threshold }));
  },

  async listMovements() {
    const rows = await stockRepository.findMovements();
    return rows.map((m) => ({
      id: m.id,
      product: m.product.name,
      type: stockMoveTypeMap.label(m.type),
      qty: m.qty,
      reason: m.reason,
      author: m.author,
      date: m.createdAt,
    }));
  },

  async adjust(input: z.infer<typeof stockAdjustSchema>) {
    const product = await productRepository.findById(input.productId);
    if (!product) throw AppError.notFound("Produit introuvable.");

    const [movement] = await Promise.all([
      stockRepository.createMovement({
        product: { connect: { id: input.productId } },
        type: stockMoveTypeMap.fromLabel(input.type),
        qty: input.qty,
        reason: input.reason,
        author: input.author,
      }),
      stockRepository.incrementStockQty(input.productId, input.qty),
    ]);

    return { id: movement.id, product: product.name, type: input.type, qty: input.qty, reason: input.reason, author: input.author };
  },
};
