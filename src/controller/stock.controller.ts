import { StatusCodes } from "http-status-codes";
import { stockService } from "../services/stock.service.js";
import { stockAdjustSchema } from "../validators/stock.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { toCsv } from "../services/csv.service.js";

export const stockController = {
  list: controllerWrapper(async (_req, res) => {
    const stock = await stockService.listStock();
    jsonResponse(res, StatusCodes.OK, "success", "Stock récupéré.", stock);
  }),

  movements: controllerWrapper(async (_req, res) => {
    const movements = await stockService.listMovements();
    jsonResponse(res, StatusCodes.OK, "success", "Mouvements de stock récupérés.", movements);
  }),

  /** Inventaire exportable : c'est le cahier de stock que le fichier remplace. */
  exportCsv: controllerWrapper(async (_req, res) => {
    const stock = await stockService.listStock();

    const csv = toCsv(stock, [
      { header: "Référence", value: (row) => row.sku },
      { header: "Produit", value: (row) => row.product },
      { header: "Coloris", value: (row) => row.color },
      { header: "Quantité", value: (row) => row.qty },
      { header: "Seuil d'alerte", value: (row) => row.threshold },
      { header: "À réapprovisionner", value: (row) => (row.low ? "Oui" : "Non") },
    ]);

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="stock-${stamp}.csv"`);
    res.status(StatusCodes.OK).send(csv);
  }),

  adjust: controllerWrapper(async (req, res) => {
    const input = stockAdjustSchema.parse(req.body);
    const movement = await stockService.adjust(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Stock ajusté.", movement);
  }),
};
