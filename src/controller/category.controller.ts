import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { categoryService } from "../services/category.service.js";
import { categorySchema, categoryUpdateSchema } from "../validators/category.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse, noContent } from "../utils/jsonResponse.js";
import { validBody } from "../middlewares/validate.js";

export const categoryController = {
  list: controllerWrapper(async (_req, res) => {
    const categories = await categoryService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Catégories récupérées.", categories);
  }),

  create: controllerWrapper(async (req, res) => {
    const category = await categoryService.create(validBody(req, categorySchema));
    jsonResponse(res, StatusCodes.CREATED, "success", "Catégorie créée.", category);
  }),

  update: controllerWrapper(async (req, res) => {
    const category = await categoryService.update(getParam(req, "id"), validBody(req, categoryUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Catégorie mise à jour.", category);
  }),

  remove: controllerWrapper(async (req, res) => {
    await categoryService.remove(getParam(req, "id"));
    noContent(res);
  }),
};
