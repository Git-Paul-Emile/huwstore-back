import { Router } from "express";
import { wishlistController } from "../controller/wishlist.controller.js";
import { validate } from "../middlewares/validate.js";
import { wishlistMergeSchema } from "../validators/wishlist.validator.js";
import { requireAuth } from "../middlewares/auth.js";

export const wishlistRoutes = Router();

wishlistRoutes.use(requireAuth);

wishlistRoutes.get("/", wishlistController.list);
wishlistRoutes.post("/merge", validate({ body: wishlistMergeSchema }), wishlistController.merge);
wishlistRoutes.post("/:productId", wishlistController.add);
wishlistRoutes.delete("/:productId", wishlistController.remove);
