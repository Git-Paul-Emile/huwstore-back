import { StatusCodes } from "http-status-codes";
import { getParam } from "../utils/getParam.js";
import { productOptionService } from "../services/product-option.service.js";
import {
  productOptionSchema,
  productOptionUpdateSchema,
  productOptionListQuerySchema,
} from "../validators/product-option.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse, noContent } from "../utils/jsonResponse.js";
import { validBody, validQuery } from "../middlewares/validate.js";

export const productOptionController = {
  list: controllerWrapper(async (req, res) => {
    const options = await productOptionService.list(validQuery(req, productOptionListQuerySchema));
    jsonResponse(res, StatusCodes.OK, "success", "Listes de valeurs récupérées.", options);
  }),

  create: controllerWrapper(async (req, res) => {
    const option = await productOptionService.create(validBody(req, productOptionSchema));
    jsonResponse(res, StatusCodes.CREATED, "success", "Valeur ajoutée.", option);
  }),

  update: controllerWrapper(async (req, res) => {
    const option = await productOptionService.update(getParam(req, "id"), validBody(req, productOptionUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Valeur mise à jour.", option);
  }),

  remove: controllerWrapper(async (req, res) => {
    await productOptionService.remove(getParam(req, "id"));
    noContent(res);
  }),
};
