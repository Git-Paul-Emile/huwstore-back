import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { promoService } from "../services/promo.service.js";
import { promoSchema, promoUpdateSchema, promoValidateSchema } from "../validators/promo.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const promoController = {
  list: controllerWrapper(async (_req, res) => {
    const promos = await promoService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Codes promo récupérés.", promos);
  }),

  validate: controllerWrapper(async (req, res) => {
    const input = promoValidateSchema.parse(req.body);
    const result = await promoService.validate(input);
    jsonResponse(res, StatusCodes.OK, "success", "Code promo appliqué.", result);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = promoSchema.parse(req.body);
    const promo = await promoService.create(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Code promo créé.", promo);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = promoUpdateSchema.parse(req.body);
    const promo = await promoService.update(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Code promo mis à jour.", promo);
  }),

  remove: controllerWrapper(async (req, res) => {
    await promoService.remove(getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Code promo supprimé.");
  }),
};
