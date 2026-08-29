import { Router } from "express";
import { addressController } from "../controller/address.controller.js";
import { validateId } from "../middlewares/validateId.js";
import { requireAuth } from "../middlewares/auth.js";

export const addressRoutes = Router();

// Le carnet d'adresses n'existe que pour un client identifie.
addressRoutes.use(requireAuth);

addressRoutes.get("/", addressController.list);
addressRoutes.post("/", addressController.create);
addressRoutes.patch("/:id", validateId, addressController.update);
addressRoutes.patch("/:id/default", validateId, addressController.setDefault);
addressRoutes.delete("/:id", validateId, addressController.remove);
