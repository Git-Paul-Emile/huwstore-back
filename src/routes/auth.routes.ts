import { Router } from "express";
import { authController } from "../controller/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireCsrfToken } from "../middlewares/csrf.js";
import { authLimiter } from "../middlewares/rateLimit.js";

export const authRoutes = Router();

// Limitation stricte sur les deux portes d'entree : ce sont les seules routes
// ou un attaquant peut essayer des mots de passe en boucle.
authRoutes.post("/register", authLimiter, authController.register);
authRoutes.post("/login", authLimiter, authController.login);

// Authentifiees par COOKIE : ce sont les seules routes exposees au CSRF, donc
// les seules a exiger le jeton anti-CSRF en en-tete.
authRoutes.post("/refresh", requireCsrfToken, authController.refresh);
authRoutes.post("/logout", requireCsrfToken, authController.logout);

authRoutes.get("/me", requireAuth, authController.me);
authRoutes.patch("/me", requireAuth, authController.updateMe);
