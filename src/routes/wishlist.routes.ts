import { Router } from "express";
import { wishlistController } from "../controller/wishlist.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const wishlistRoutes = Router();

wishlistRoutes.use(requireAuth);

wishlistRoutes.get("/", wishlistController.list);
wishlistRoutes.post("/merge", wishlistController.merge);
wishlistRoutes.post("/:productId", wishlistController.add);
wishlistRoutes.delete("/:productId", wishlistController.remove);
