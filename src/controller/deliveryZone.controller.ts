import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { deliveryZoneService } from "../services/deliveryZone.service.js";
import { deliveryZoneSchema, deliveryZoneUpdateSchema } from "../validators/deliveryZone.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const deliveryZoneController = {
  list: controllerWrapper(async (_req, res) => {
    const zones = await deliveryZoneService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Zones de livraison récupérées.", zones);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = deliveryZoneSchema.parse(req.body);
    const zone = await deliveryZoneService.create(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Zone de livraison créée.", zone);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = deliveryZoneUpdateSchema.parse(req.body);
    const zone = await deliveryZoneService.update(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Zone de livraison mise à jour.", zone);
  }),

  remove: controllerWrapper(async (req, res) => {
    await deliveryZoneService.remove(getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Zone de livraison supprimée.");
  }),
};
