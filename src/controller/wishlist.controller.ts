import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { wishlistService } from "../services/wishlist.service.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { AppError } from "../utils/AppError.js";
import { getParam } from "../utils/getParam.js";
import type { Request } from "express";

const currentUser = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.userId;
};

const mergeSchema = z.object({ productIds: z.array(z.string().min(1)).max(200).default([]) });

export const wishlistController = {
  list: controllerWrapper(async (req, res) => {
    const ids = await wishlistService.list(currentUser(req));
    jsonResponse(res, StatusCodes.OK, "success", "Favoris récupérés.", ids);
  }),

  add: controllerWrapper(async (req, res) => {
    const ids = await wishlistService.add(currentUser(req), getParam(req, "productId"));
    jsonResponse(res, StatusCodes.OK, "success", "Ajouté aux favoris.", ids);
  }),

  remove: controllerWrapper(async (req, res) => {
    const ids = await wishlistService.remove(currentUser(req), getParam(req, "productId"));
    jsonResponse(res, StatusCodes.OK, "success", "Retiré des favoris.", ids);
  }),

  merge: controllerWrapper(async (req, res) => {
    const { productIds } = mergeSchema.parse(req.body);
    const ids = await wishlistService.merge(currentUser(req), productIds);
    jsonResponse(res, StatusCodes.OK, "success", "Favoris synchronisés.", ids);
  }),
};
