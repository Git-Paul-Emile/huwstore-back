import { StatusCodes } from "http-status-codes";
import { cartService } from "../services/cart.service.js";
import { cartAddSchema, cartQtySchema, cartMergeSchema } from "../validators/cart.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse, noContent } from "../utils/jsonResponse.js";
import { AppError } from "../utils/AppError.js";
import { getParam } from "../utils/getParam.js";
import { validBody } from "../middlewares/validate.js";
import type { Request } from "express";

const currentUser = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.userId;
};

export const cartController = {
  list: controllerWrapper(async (req, res) => {
    const lines = await cartService.list(currentUser(req));
    jsonResponse(res, StatusCodes.OK, "success", "Panier récupéré.", lines);
  }),

  add: controllerWrapper(async (req, res) => {
    const { variantId, qty } = validBody(req, cartAddSchema);
    const lines = await cartService.add(currentUser(req), variantId, qty);
    jsonResponse(res, StatusCodes.OK, "success", "Ajouté au panier.", lines);
  }),

  setQty: controllerWrapper(async (req, res) => {
    const { qty } = validBody(req, cartQtySchema);
    const lines = await cartService.setQty(currentUser(req), getParam(req, "variantId"), qty);
    jsonResponse(res, StatusCodes.OK, "success", "Quantité mise à jour.", lines);
  }),

  // Renvoie le panier a jour plutot qu'un 204 : le client reaffiche l'etat
  // complet sans nouvel aller-retour, comme pour les favoris.
  remove: controllerWrapper(async (req, res) => {
    const lines = await cartService.remove(currentUser(req), getParam(req, "variantId"));
    jsonResponse(res, StatusCodes.OK, "success", "Retiré du panier.", lines);
  }),

  merge: controllerWrapper(async (req, res) => {
    const { lines: input } = validBody(req, cartMergeSchema);
    const lines = await cartService.merge(currentUser(req), input);
    jsonResponse(res, StatusCodes.OK, "success", "Panier synchronisé.", lines);
  }),

  // Vidage complet, appelé une fois la commande enregistrée : 204, le client
  // n'a rien à relire, son panier local repart de zéro.
  clear: controllerWrapper(async (req, res) => {
    await cartService.clear(currentUser(req));
    noContent(res);
  }),
};
