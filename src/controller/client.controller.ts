import { StatusCodes } from "http-status-codes";
import { clientService } from "../services/client.service.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";

export const clientController = {
  list: controllerWrapper(async (_req, res) => {
    const clients = await clientService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Clients récupérés.", clients);
  }),
};
