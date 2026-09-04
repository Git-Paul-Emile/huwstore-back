import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { bannerService } from "../services/banner.service.js";
import { bannerListQuerySchema, bannerSchema, bannerUpdateSchema } from "../validators/banner.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse, noContent } from "../utils/jsonResponse.js";
import { validBody, validQuery } from "../middlewares/validate.js";

export const bannerController = {
  list: controllerWrapper(async (req, res) => {
    const banners = await bannerService.list(validQuery(req, bannerListQuerySchema));
    jsonResponse(res, StatusCodes.OK, "success", "Bannières récupérées.", banners);
  }),

  create: controllerWrapper(async (req, res) => {
    const banner = await bannerService.create(validBody(req, bannerSchema));
    jsonResponse(res, StatusCodes.CREATED, "success", "Bannière créée.", banner);
  }),

  update: controllerWrapper(async (req, res) => {
    const banner = await bannerService.update(getParam(req, "id"), validBody(req, bannerUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Bannière mise à jour.", banner);
  }),

  remove: controllerWrapper(async (req, res) => {
    await bannerService.remove(getParam(req, "id"));
    noContent(res);
  }),
};
