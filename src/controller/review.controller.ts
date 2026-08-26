import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { reviewService } from "../services/review.service.js";
import { reviewSchema, reviewStatusUpdateSchema } from "../validators/review.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const reviewController = {
  list: controllerWrapper(async (_req, res) => {
    const reviews = await reviewService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Avis récupérés.", reviews);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = reviewSchema.parse(req.body);
    const review = await reviewService.create(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Avis envoyé, en attente de modération.", review);
  }),

  updateStatus: controllerWrapper(async (req, res) => {
    const input = reviewStatusUpdateSchema.parse(req.body);
    const review = await reviewService.updateStatus(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Statut de l'avis mis à jour.", review);
  }),
};
