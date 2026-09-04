import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { feedbackService } from "../services/feedback.service.js";
import { feedbackSchema, feedbackUpdateSchema } from "../validators/feedback.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse, noContent } from "../utils/jsonResponse.js";
import { validBody } from "../middlewares/validate.js";

export const feedbackController = {
  list: controllerWrapper(async (_req, res) => {
    const feedbacks = await feedbackService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Avis récupérés.", feedbacks);
  }),

  create: controllerWrapper(async (req, res) => {
    const feedback = await feedbackService.create(validBody(req, feedbackSchema));
    jsonResponse(res, StatusCodes.CREATED, "success", "Merci pour votre avis.", feedback);
  }),

  update: controllerWrapper(async (req, res) => {
    const feedback = await feedbackService.update(getParam(req, "id"), validBody(req, feedbackUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Avis mis à jour.", feedback);
  }),

  remove: controllerWrapper(async (req, res) => {
    await feedbackService.remove(getParam(req, "id"));
    noContent(res);
  }),
};
