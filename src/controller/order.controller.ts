import { getParam } from "../utils/getParam.js";
import { StatusCodes } from "http-status-codes";
import { orderService } from "../services/order.service.js";
import { orderCreateSchema, orderUpdateSchema, orderListQuerySchema } from "../validators/order.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { AppError } from "../utils/AppError.js";

export const orderController = {
  list: controllerWrapper(async (req, res) => {
    const query = orderListQuerySchema.parse(req.query);
    const { items, meta } = await orderService.list(query);
    jsonResponse(res, StatusCodes.OK, "success", "Commandes récupérées.", items, meta);
  }),

  mine: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const orders = await orderService.listMine(req.user.userId);
    jsonResponse(res, StatusCodes.OK, "success", "Vos commandes récupérées.", orders);
  }),

  create: controllerWrapper(async (req, res) => {
    const input = orderCreateSchema.parse(req.body);
    const order = await orderService.create(input, req.user?.userId);
    jsonResponse(res, StatusCodes.CREATED, "success", "Commande créée.", order);
  }),

  update: controllerWrapper(async (req, res) => {
    const input = orderUpdateSchema.parse(req.body);
    const order = await orderService.update(getParam(req, "id"), input);
    jsonResponse(res, StatusCodes.OK, "success", "Commande mise à jour.", order);
  }),
};
