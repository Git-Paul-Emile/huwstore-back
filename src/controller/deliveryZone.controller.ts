import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { deliveryZoneService } from "../services/deliveryZone.service.js";
import { deliveryZoneSchema, deliveryZoneUpdateSchema } from "../validators/deliveryZone.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse, noContent } from "../utils/jsonResponse.js";
import { validBody } from "../middlewares/validate.js";

export const deliveryZoneController = {
  list: controllerWrapper(async (_req, res) => {
    const zones = await deliveryZoneService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Zones de livraison récupérées.", zones);
  }),

  create: controllerWrapper(async (req, res) => {
    const zone = await deliveryZoneService.create(validBody(req, deliveryZoneSchema));
    jsonResponse(res, StatusCodes.CREATED, "success", "Zone de livraison créée.", zone);
  }),

  update: controllerWrapper(async (req, res) => {
    const zone = await deliveryZoneService.update(getParam(req, "id"), validBody(req, deliveryZoneUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Zone de livraison mise à jour.", zone);
  }),

  remove: controllerWrapper(async (req, res) => {
    await deliveryZoneService.remove(getParam(req, "id"));
    noContent(res);
  }),
};
