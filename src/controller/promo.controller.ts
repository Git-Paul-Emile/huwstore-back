import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { promoService } from "../services/promo.service.js";
import { promoSchema, promoUpdateSchema, promoValidateSchema } from "../validators/promo.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse, noContent } from "../utils/jsonResponse.js";
import { validBody } from "../middlewares/validate.js";

export const promoController = {
  list: controllerWrapper(async (_req, res) => {
    const promos = await promoService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Codes promo récupérés.", promos);
  }),

  validate: controllerWrapper(async (req, res) => {
    const result = await promoService.validate(validBody(req, promoValidateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Code promo appliqué.", result);
  }),

  create: controllerWrapper(async (req, res) => {
    const promo = await promoService.create(validBody(req, promoSchema));
    jsonResponse(res, StatusCodes.CREATED, "success", "Code promo créé.", promo);
  }),

  update: controllerWrapper(async (req, res) => {
    const promo = await promoService.update(getParam(req, "id"), validBody(req, promoUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Code promo mis à jour.", promo);
  }),

  remove: controllerWrapper(async (req, res) => {
    await promoService.remove(getParam(req, "id"));
    noContent(res);
  }),
};
