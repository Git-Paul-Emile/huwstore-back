import { StatusCodes } from "http-status-codes";
import { getParam } from "../utils/getParam.js";
import { productService } from "../services/product.service.js";
import { productSchema, productUpdateSchema, productListQuerySchema } from "../validators/product.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse, noContent } from "../utils/jsonResponse.js";
import { validBody, validQuery } from "../middlewares/validate.js";

export const productController = {
  list: controllerWrapper(async (req, res) => {
    const { items, meta } = await productService.list(validQuery(req, productListQuerySchema));
    jsonResponse(res, StatusCodes.OK, "success", "Produits récupérés.", items, meta);
  }),

  /** Valeurs de filtre réellement présentes en base (matières, couleurs). */
  facets: controllerWrapper(async (_req, res) => {
    const facets = await productService.facets();
    jsonResponse(res, StatusCodes.OK, "success", "Facettes récupérées.", facets);
  }),

  getById: controllerWrapper(async (req, res) => {
    const product = await productService.getById(getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Produit récupéré.", product);
  }),

  create: controllerWrapper(async (req, res) => {
    const product = await productService.create(validBody(req, productSchema));
    jsonResponse(res, StatusCodes.CREATED, "success", "Produit créé.", product);
  }),

  update: controllerWrapper(async (req, res) => {
    const product = await productService.update(getParam(req, "id"), validBody(req, productUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Produit mis à jour.", product);
  }),

  remove: controllerWrapper(async (req, res) => {
    await productService.remove(getParam(req, "id"));
    noContent(res);
  }),
};
