import { StatusCodes } from "http-status-codes";
import { mediaService } from "../services/media.service.js";
import { mediaUploadSchema } from "../validators/media.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { validBody } from "../middlewares/validate.js";

export const mediaController = {
  upload: controllerWrapper(async (req, res) => {
    const media = await mediaService.upload(validBody(req, mediaUploadSchema));
    jsonResponse(res, StatusCodes.CREATED, "success", "Média téléversé.", media);
  }),
};
