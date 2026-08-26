import { StatusCodes } from "http-status-codes";
import { statsService } from "../services/stats.service.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const statsController = {
  dashboard: controllerWrapper(async (_req, res) => {
    const dashboard = await statsService.dashboard();
    jsonResponse(res, StatusCodes.OK, "success", "Indicateurs récupérés.", dashboard);
  }),

  sales7: controllerWrapper(async (_req, res) => {
    const sales = await statsService.salesLast7Days();
    jsonResponse(res, StatusCodes.OK, "success", "Ventes des 7 derniers jours récupérées.", sales);
  }),

  salesByCategory: controllerWrapper(async (_req, res) => {
    const sales = await statsService.salesByCategory();
    jsonResponse(res, StatusCodes.OK, "success", "Ventes par catégorie récupérées.", sales);
  }),
};
