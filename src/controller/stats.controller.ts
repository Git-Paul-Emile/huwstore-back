import { StatusCodes } from "http-status-codes";
import { statsService } from "../services/stats.service.js";
import { overviewQuerySchema, topProductsQuerySchema } from "../validators/stats.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { validQuery } from "../middlewares/validate.js";

export const statsController = {
  dashboard: controllerWrapper(async (_req, res) => {
    const dashboard = await statsService.dashboard();
    jsonResponse(res, StatusCodes.OK, "success", "Indicateurs récupérés.", dashboard);
  }),

  overview: controllerWrapper(async (req, res) => {
    const { days } = validQuery(req, overviewQuerySchema);
    const overview = await statsService.overview(days);
    jsonResponse(res, StatusCodes.OK, "success", "Chiffres clés récupérés.", overview);
  }),

  sales7: controllerWrapper(async (_req, res) => {
    const sales = await statsService.salesLast7Days();
    jsonResponse(res, StatusCodes.OK, "success", "Ventes des 7 derniers jours récupérées.", sales);
  }),

  topProducts: controllerWrapper(async (req, res) => {
    const { days, limit } = validQuery(req, topProductsQuerySchema);
    const products = await statsService.topProducts(days, limit);
    jsonResponse(res, StatusCodes.OK, "success", "Meilleures ventes récupérées.", products);
  }),

  salesByCategory: controllerWrapper(async (_req, res) => {
    const sales = await statsService.salesByCategory();
    jsonResponse(res, StatusCodes.OK, "success", "Ventes par catégorie récupérées.", sales);
  }),
};
