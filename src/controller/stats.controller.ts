import { StatusCodes } from "http-status-codes";
import { statsService } from "../services/stats.service.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const statsController = {
  dashboard: controllerWrapper(async (_req, res) => {
    const dashboard = await statsService.dashboard();
    jsonResponse(res, StatusCodes.OK, "success", "Indicateurs récupérés.", dashboard);
  }),

  overview: controllerWrapper(async (req, res) => {
    const days = Number(req.query.days ?? 30);
    const overview = await statsService.overview(
      Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30,
    );
    jsonResponse(res, StatusCodes.OK, "success", "Chiffres clés récupérés.", overview);
  }),

  sales7: controllerWrapper(async (_req, res) => {
    const sales = await statsService.salesLast7Days();
    jsonResponse(res, StatusCodes.OK, "success", "Ventes des 7 derniers jours récupérées.", sales);
  }),

  topProducts: controllerWrapper(async (req, res) => {
    const days = Number(req.query.days ?? 90);
    const limit = Number(req.query.limit ?? 8);
    const products = await statsService.topProducts(
      Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 90,
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 8,
    );
    jsonResponse(res, StatusCodes.OK, "success", "Meilleures ventes récupérées.", products);
  }),

  salesByCategory: controllerWrapper(async (_req, res) => {
    const sales = await statsService.salesByCategory();
    jsonResponse(res, StatusCodes.OK, "success", "Ventes par catégorie récupérées.", sales);
  }),
};
