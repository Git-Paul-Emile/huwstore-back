import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { productRoutes } from "./product.routes.js";
import { categoryRoutes } from "./category.routes.js";
import { deliveryZoneRoutes } from "./deliveryZone.routes.js";
import { orderRoutes } from "./order.routes.js";
import { clientRoutes } from "./client.routes.js";
import { bannerRoutes } from "./banner.routes.js";
import { promoRoutes } from "./promo.routes.js";
import { reviewRoutes } from "./review.routes.js";
import { stockRoutes } from "./stock.routes.js";
import { statsRoutes } from "./stats.routes.js";

export const router = Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/delivery-zones", deliveryZoneRoutes);
router.use("/orders", orderRoutes);
router.use("/clients", clientRoutes);
router.use("/banners", bannerRoutes);
router.use("/promos", promoRoutes);
router.use("/reviews", reviewRoutes);
router.use("/stock", stockRoutes);
router.use("/stats", statsRoutes);
