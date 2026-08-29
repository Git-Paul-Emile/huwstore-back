import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "../services/auth.service.js";
import { loginSchema, profileUpdateSchema, registerSchema } from "../validators/auth.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { AppError } from "../utils/AppError.js";
import { verifyRefreshToken } from "../config/jwt.js";
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

export const authController = {
  register: controllerWrapper(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const { refreshToken, ...body } = await authService.register(input);
    openSession(res, refreshToken);
    jsonResponse(res, StatusCodes.CREATED, "success", "Compte créé.", body);
  }),

  login: controllerWrapper(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { refreshToken, ...body } = await authService.login(input);
    openSession(res, refreshToken);
    jsonResponse(res, StatusCodes.OK, "success", "Connexion réussie.", body);
  }),

  /**
   * Renouvellement du jeton d'accès.
   *
   * Le jeton d'accès ne vit que 15 minutes : sans cette route, la cliente serait
   * déconnectée en pleine commande. Le cookie de rafraîchissement, lui, vit
   * 30 jours et n'est jamais exposé au JavaScript.
   *
   * Rotation : un nouveau jeton de rafraîchissement est émis à chaque appel, ce
   * qui raccourcit la durée de vie utile d'un jeton qui aurait fuité.
   */
  refresh: controllerWrapper(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
      throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");
    }

    const { refreshToken, ...body } = await authService.refresh(payload.userId);
    openSession(res, refreshToken);
    jsonResponse(res, StatusCodes.OK, "success", "Session renouvelée.", body);
  }),

  logout: controllerWrapper(async (_req, res) => {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.clearCookie(CSRF_COOKIE, csrfCookieOptions);
    jsonResponse(res, StatusCodes.OK, "success", "Déconnecté.");
  }),

  me: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await authService.me(req.user.userId);
    jsonResponse(res, StatusCodes.OK, "success", "Utilisateur récupéré.", user);
  }),

  updateMe: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const input = profileUpdateSchema.parse(req.body);
    const user = await authService.updateProfile(req.user.userId, input);
    jsonResponse(res, StatusCodes.OK, "success", "Informations mises à jour.", user);
  }),
};
