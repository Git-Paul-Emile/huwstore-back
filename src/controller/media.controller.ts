import { StatusCodes } from "http-status-codes";
import { mediaService } from "../services/media.service.js";
import { mediaUploadSchema } from "../validators/media.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const mediaController = {
  upload: controllerWrapper(async (req, res) => {
    const input = mediaUploadSchema.parse(req.body);
    const media = await mediaService.upload(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Média téléversé.", media);
  }),
};
