import bcrypt from "bcrypt";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/AppError.js";
import { signAccessToken, signRefreshToken } from "../config/jwt.js";
import type { loginSchema, registerSchema } from "../validators/auth.validator.js";
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

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("Utilisateur introuvable.");
    return toDto(user);
  },
};
