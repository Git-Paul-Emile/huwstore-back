import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { bannerService } from "../services/banner.service.js";
import { bannerListQuerySchema, bannerSchema, bannerUpdateSchema } from "../validators/banner.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const bannerController = {
  list: controllerWrapper(async (req, res) => {
    const query = bannerListQuerySchema.parse(req.query);
    const banners = await bannerService.list(query);
    jsonResponse(res, StatusCodes.OK, "success", "Bannières récupérées.", banners);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = bannerSchema.parse(req.body);
    const banner = await bannerService.create(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Bannière créée.", banner);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = bannerUpdateSchema.parse(req.body);
    const banner = await bannerService.update(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Bannière mise à jour.", banner);
  }),

  remove: controllerWrapper(async (req, res) => {
    await bannerService.remove(getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Bannière supprimée.");
  }),
};
