import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { testimonialService } from "../services/testimonial.service.js";
import { testimonialSchema, testimonialUpdateSchema } from "../validators/testimonial.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const testimonialController = {
  list: controllerWrapper(async (_req, res) => {
    const testimonials = await testimonialService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Témoignages récupérés.", testimonials);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = testimonialSchema.parse(req.body);
    const testimonial = await testimonialService.create(input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Témoignage créé.", testimonial);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = testimonialUpdateSchema.parse(req.body);
    const testimonial = await testimonialService.update(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Témoignage mis à jour.", testimonial);
  }),

  remove: controllerWrapper(async (req, res) => {
    await testimonialService.remove(getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Témoignage supprimé.");
  }),
};
