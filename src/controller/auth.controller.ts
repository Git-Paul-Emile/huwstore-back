import { StatusCodes } from "http-status-codes";
import { authService } from "../services/auth.service.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { AppError } from "../utils/AppError.js";

const REFRESH_COOKIE = "mw-refresh-token";
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, maxAge: 30 * 24 * 60 * 60 * 1000 };

export const authController = {
  register: controllerWrapper(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const { refreshToken, ...body } = await authService.register(input);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    jsonResponse(res, StatusCodes.CREATED, "success", "Compte créé.", body);
  }),

  login: controllerWrapper(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { refreshToken, ...body } = await authService.login(input);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    jsonResponse(res, StatusCodes.OK, "success", "Connexion réussie.", body);
  }),

  logout: controllerWrapper(async (_req, res) => {
    res.clearCookie(REFRESH_COOKIE);
    jsonResponse(res, StatusCodes.OK, "success", "Déconnecté.");
  }),

  me: controllerWrapper(async (req, res) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await authService.me(req.user.userId);
    jsonResponse(res, StatusCodes.OK, "success", "Utilisateur récupéré.", user);
  }),
};
