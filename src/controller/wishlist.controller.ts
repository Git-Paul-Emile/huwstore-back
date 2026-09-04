import { StatusCodes } from "http-status-codes";
import { wishlistService } from "../services/wishlist.service.js";
import { wishlistMergeSchema } from "../validators/wishlist.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { AppError } from "../utils/AppError.js";
import { getParam } from "../utils/getParam.js";
import { validBody } from "../middlewares/validate.js";
import type { Request } from "express";

const currentUser = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.userId;
};

export const wishlistController = {
  list: controllerWrapper(async (req, res) => {
    const ids = await wishlistService.list(currentUser(req));
    jsonResponse(res, StatusCodes.OK, "success", "Favoris récupérés.", ids);
  }),

  add: controllerWrapper(async (req, res) => {
    const ids = await wishlistService.add(currentUser(req), getParam(req, "productId"));
    jsonResponse(res, StatusCodes.OK, "success", "Ajouté aux favoris.", ids);
  }),

  // Renvoie la liste à jour plutôt qu'un 204 : ajouter et retirer sont des
  // bascules sur la collection « favoris », et le client réaffiche l'état
  // complet sans nouvel aller-retour.
  remove: controllerWrapper(async (req, res) => {
    const ids = await wishlistService.remove(currentUser(req), getParam(req, "productId"));
    jsonResponse(res, StatusCodes.OK, "success", "Retiré des favoris.", ids);
  }),

  merge: controllerWrapper(async (req, res) => {
    const { productIds } = validBody(req, wishlistMergeSchema);
    const ids = await wishlistService.merge(currentUser(req), productIds);
    jsonResponse(res, StatusCodes.OK, "success", "Favoris synchronisés.", ids);
  }),
};
