import { StatusCodes } from "http-status-codes";
import { stockService } from "../services/stock.service.js";
import { stockAdjustSchema } from "../validators/stock.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const stockController = {
  list: controllerWrapper(async (_req, res) => {
    const stock = await stockService.listStock();
    jsonResponse(res, StatusCodes.OK, "success", "Stock récupéré.", stock);
  }),

  movements: controllerWrapper(async (_req, res) => {
    const movements = await stockService.listMovements();
    jsonResponse(res, StatusCodes.OK, "success", "Mouvements de stock récupérés.", movements);
  }),

  adjust: controllerWrapper(async (req, res) => {
    const input = stockAdjustSchema.parse(req.body);
    const movement = await stockService.adjust(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Stock ajusté.", movement);
  }),
};
