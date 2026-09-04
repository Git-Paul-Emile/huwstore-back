import { StatusCodes } from "http-status-codes";
import { settingService } from "../services/setting.service.js";
import { settingUpdateSchema } from "../validators/setting.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { validBody } from "../middlewares/validate.js";

export const settingController = {
  get: controllerWrapper(async (_req, res) => {
    const settings = await settingService.get();
    jsonResponse(res, StatusCodes.OK, "success", "Paramètres récupérés.", settings);
  }),

  update: controllerWrapper(async (req, res) => {
    const settings = await settingService.update(validBody(req, settingUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Paramètres mis à jour.", settings);
  }),
};
