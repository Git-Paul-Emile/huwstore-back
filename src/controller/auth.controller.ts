import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "../services/auth.service.js";
import { loginSchema, profileUpdateSchema, registerSchema } from "../validators/auth.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { validBody } from "../middlewares/validate.js";
import { AppError } from "../utils/AppError.js";
import { CSRF_COOKIE, REFRESH_COOKIE, csrfCookieOptions, refreshCookieOptions } from "../config/cookies.js";

/**
 * Pose les deux cookies de session : le jeton de rafraîchissement (HttpOnly) et
 * le jeton anti-CSRF (lisible par le front). Les deux sont toujours écrits
 * ensemble, sinon le rafraîchissement échouerait faute d'en-tête à recopier.
 */
function openSession(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  res.cookie(CSRF_COOKIE, randomUUID(), csrfCookieOptions);
}

/** Efface les deux cookies de session. */
function clearSession(res: Response) {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.clearCookie(CSRF_COOKIE, csrfCookieOptions);
}

export const authController = {
  register: controllerWrapper(async (req, res) => {
    const { refreshToken, ...body } = await authService.register(validBody(req, registerSchema));
    openSession(res, refreshToken);
    jsonResponse(res, StatusCodes.CREATED, "success", "Compte créé.", body);
  }),

  login: controllerWrapper(async (req, res) => {
    const { refreshToken, ...body } = await authService.login(validBody(req, loginSchema));
    openSession(res, refreshToken);
    jsonResponse(res, StatusCodes.OK, "success", "Connexion réussie.", body);
  }),

  /**
   * Renouvellement du jeton d'accès.
   *
   * Le jeton d'accès ne vit que 15 minutes : sans cette route, la cliente serait
   * déconnectée en pleine commande. Le cookie de rafraîchissement, lui, vit
   * 30 jours et n'est jamais exposé au JavaScript. La rotation (révocation de
   * l'ancien jeton, émission d'un nouveau) et la détection de réutilisation
   * vivent dans `authService.refresh`.
   */
  refresh: controllerWrapper(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");

    try {
      const { refreshToken, ...body } = await authService.refresh(token);
      openSession(res, refreshToken);
      jsonResponse(res, StatusCodes.OK, "success", "Session renouvelée.", body);
    } catch (error) {
      // Jeton refusé : on retire les cookies pour que le front repasse anonyme
      // plutôt que de boucler sur un refresh voué à échouer.
      clearSession(res);
      throw error;
    }
  }),

  logout: controllerWrapper(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    clearSession(res);
    jsonResponse(res, StatusCodes.OK, "success", "Déconnecté.");
  }),

  me: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await authService.me(req.user.userId);
    jsonResponse(res, StatusCodes.OK, "success", "Utilisateur récupéré.", user);
  }),

  updateMe: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await authService.updateProfile(req.user.userId, validBody(req, profileUpdateSchema));
    jsonResponse(res, StatusCodes.OK, "success", "Informations mises à jour.", user);
  }),
};
