import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { userRepository } from "../repositories/user.repository.js";
import { refreshTokenRepository } from "../repositories/refreshToken.repository.js";
import { AppError } from "../utils/AppError.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../config/jwt.js";
import type { loginSchema, profileUpdateSchema, registerSchema } from "../validators/auth.validator.js";
import type { z } from "zod";

/**
 * Coût de hachage bcrypt. Chaque incrément double le temps de calcul : 12
 * reste imperceptible à la connexion (~250 ms) tout en rendant une attaque par
 * dictionnaire hors ligne beaucoup plus lente. Les hachages déjà en base
 * portent leur propre coût, `bcrypt.compare` les relit : bumper cette valeur
 * n'invalide aucun mot de passe existant.
 */
const BCRYPT_ROUNDS = 12;

/** Durée de vie du jeton de rafraîchissement, alignée sur `signRefreshToken` (30 jours). */
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** SHA-256 : la table ne stocke jamais le jeton en clair, seulement son empreinte. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const toDto = (user: { id: string; name: string; phone: string; email: string | null; role: "CLIENT" | "ADMIN" }) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email ?? undefined,
  role: user.role,
});

type SessionUser = { id: string; name: string; phone: string; email: string | null; role: "CLIENT" | "ADMIN" };

/**
 * Émet une session : jeton d'accès court + jeton de rafraîchissement long,
 * ce dernier enregistré (haché) et rattaché à une `family`. À la connexion,
 * une nouvelle famille naît ; à un refresh, on reste dans la même famille pour
 * pouvoir tout révoquer si un vol est détecté.
 */
async function issueSession(user: SessionUser | null, family?: string) {
  if (!user) throw AppError.unauthorized();

  const payload = { userId: user.id, role: user.role };
  const refreshToken = signRefreshToken(payload);

  await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    family: family ?? randomUUID(),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  return { user: toDto(user), accessToken: signAccessToken(payload), refreshToken };
}

export const authService = {
  async register(input: z.infer<typeof registerSchema>) {
    const existing = await userRepository.findByPhone(input.phone);
    if (existing) throw AppError.conflict("Un compte existe déjà avec ce numéro.");

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
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
   * Rotation du jeton de rafraîchissement (rules/security.md).
   *
   * Le jeton présenté doit être valide (signature), connu en base, non révoqué
   * et non expiré. On le révoque alors et on en émet un nouveau dans la même
   * famille. Si le jeton est valide mais DÉJÀ révoqué, c'est qu'il a été rejoué
   * après rotation : signe d'un vol, on révoque toute la famille et on refuse.
   */
  async refresh(rawToken: string) {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");
    }

    const stored = await refreshTokenRepository.findByHash(hashToken(rawToken));
    if (!stored || stored.userId !== payload.userId) {
      throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");
    }

    if (stored.revokedAt) {
      await refreshTokenRepository.revokeFamily(stored.family);
      throw AppError.unauthorized("Session invalidée pour raison de sécurité, veuillez vous reconnecter.");
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");
    }

    await refreshTokenRepository.revokeById(stored.id);

    // On relit l'utilisateur : un compte supprimé, ou dont le rôle a changé, ne
    // doit pas continuer à vivre sur la foi d'un jeton émis autrefois.
    const user = await userRepository.findById(stored.userId);
    if (!user) throw AppError.unauthorized("Session expirée, veuillez vous reconnecter.");

    return issueSession(user, stored.family);
  },

  /** Déconnexion : révoque toute la famille du jeton présenté. Idempotent. */
  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const stored = await refreshTokenRepository.findByHash(hashToken(rawToken));
    if (stored) await refreshTokenRepository.revokeFamily(stored.family);
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
      data.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    }

    return toDto(await userRepository.update(userId, data));
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("Utilisateur introuvable.");
    return toDto(user);
  },
};
