import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { categoryService } from "../services/category.service.js";
import { categorySchema, categoryUpdateSchema } from "../validators/category.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const categoryController = {
  list: controllerWrapper(async (_req, res) => {
    const categories = await categoryService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Catégories récupérées.", categories);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = categorySchema.parse(req.body);
    const category = await categoryService.create(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Catégorie créée.", category);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = categoryUpdateSchema.parse(req.body);
    const category = await categoryService.update(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Catégorie mise à jour.", category);
  }),

  remove: controllerWrapper(async (req, res) => {
    await categoryService.remove(getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Catégorie supprimée.");
  }),
};
