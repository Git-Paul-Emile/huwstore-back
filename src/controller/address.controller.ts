import { StatusCodes } from "http-status-codes";
import { addressService } from "../services/address.service.js";
import { addressSchema, addressUpdateSchema } from "../validators/address.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { AppError } from "../utils/AppError.js";
import { getParam } from "../utils/getParam.js";
import type { Request } from "express";

/** requireAuth garantit la presence du jeton ; ce garde-fou rassure TypeScript. */
const currentUser = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.userId;
};

export const addressController = {
  list: controllerWrapper(async (req, res) => {
    const addresses = await addressService.list(currentUser(req));
    jsonResponse(res, StatusCodes.OK, "success", "Adresses récupérées.", addresses);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = addressSchema.parse(req.body);
    const address = await addressService.create(currentUser(req), input);
    jsonResponse(res, StatusCodes.CREATED, "success", "Adresse enregistrée.", address);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = addressUpdateSchema.parse(req.body);
    const address = await addressService.update(currentUser(req), getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Adresse mise à jour.", address);
  }),

  setDefault: controllerWrapper(async (req, res) => {
    const address = await addressService.setDefault(currentUser(req), getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Adresse par défaut mise à jour.", address);
  }),

  remove: controllerWrapper(async (req, res) => {
    await addressService.remove(currentUser(req), getParam(req, "id"));
    jsonResponse(res, StatusCodes.OK, "success", "Adresse supprimée.");
  }),
};
