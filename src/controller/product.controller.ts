import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { productService } from "../services/product.service.js";
import { productSchema, productUpdateSchema, productListQuerySchema } from "../validators/product.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const productController = {
  list: controllerWrapper(async (req, res) => {
    const query = productListQuerySchema.parse(req.query);
    const products = await productService.list(query);
    jsonResponse(res, StatusCodes.OK, "success", "Produits récupérés.", products);
  }),

  getById: controllerWrapper(async (req, res) => {
    const product = await productService.getById(getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Produit récupéré.", product);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = productSchema.parse(req.body);
    const product = await productService.create(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Produit créé.", product);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = productUpdateSchema.parse(req.body);
    const product = await productService.update(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Produit mis à jour.", product);
  }),

  remove: controllerWrapper(async (req, res) => {
    await productService.remove(getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Produit supprimé.");
  }),
};
