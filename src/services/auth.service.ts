import bcrypt from "bcrypt";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/AppError.js";
import { signAccessToken, signRefreshToken } from "../config/jwt.js";
import type { loginSchema, profileUpdateSchema, registerSchema } from "../validators/auth.validator.js";
import type { z } from "zod";

const toDto = (user: { id: string; name: string; phone: string; email: string | null; role: "CLIENT" | "ADMIN" }) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email ?? undefined,
  role: user.role,
});

async function issueSession(user: Awaited<ReturnType<typeof userRepository.findByPhone>>) {
  if (!user) throw AppError.unauthorized();
  const payload = { userId: user.id, role: user.role };
  return {
    user: toDto(user),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export const authService = {
  async register(input: z.infer<typeof registerSchema>) {
    const existing = await userRepository.findByPhone(input.phone);
    if (existing) throw AppError.conflict("Un compte existe déjà avec ce numéro.");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await userRepository.create({
      name: input.name,
      phone: input.phone,
      email: input.email,
      passwordHash,
    });
    return issueSession(user);
  },

  async login(input: z.infer<typeof loginSchema>) {
    const user = await userRepository.findByPhone(input.phone);
    if (!user) throw AppError.unauthorized("Identifiants invalides.");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw AppError.unauthorized("Identifiants invalides.");

    return issueSession(user);
  },

  /**
   * Renouvelle la session a partir du seul identifiant porte par le jeton de
   * rafraichissement. On RELIT l'utilisateur en base a chaque fois : un compte
   * supprime, ou dont le role a change, ne doit pas continuer a vivre pendant
   * trente jours sur la foi d'un jeton emis autrefois.
   */
  async refresh(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");
    return issueSession(user);
  },

  /**
   * Mise a jour du profil. Deux precautions qui n'en font qu'une : on relit
   * l'utilisateur en base (le jeton ne porte que son identifiant), et on exige
   * le mot de passe actuel avant d'en accepter un nouveau.
   */
  async updateProfile(userId: string, input: z.infer<typeof profileUpdateSchema>) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("Utilisateur introuvable.");

    const data: { name?: string; email?: string | null; passwordHash?: string } = {};

    if (input.name) data.name = input.name;

    if (input.email !== undefined) {
      if (input.email) {
        const existing = await userRepository.findByEmail(input.email);
        if (existing && existing.id !== userId) throw AppError.conflict("Cette adresse e-mail est déjà utilisée.");
      }
      data.email = input.email;
    }

    if (input.newPassword) {
      const valid = await bcrypt.compare(input.currentPassword ?? "", user.passwordHash);
      if (!valid) throw AppError.badRequest("Mot de passe actuel incorrect.");
      data.passwordHash = await bcrypt.hash(input.newPassword, 10);
    }

    return toDto(await userRepository.update(userId, data));
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("Utilisateur introuvable.");
    return toDto(user);
  },
};
