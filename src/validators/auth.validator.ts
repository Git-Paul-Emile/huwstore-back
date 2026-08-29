import { z } from "zod";
import { emailSchema, passwordSchema, phoneSchema } from "./common.js";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Votre nom complet est requis.").max(80),
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
});

/**
 * A la connexion on ne re-verifie PAS le format du mot de passe : un ancien
 * compte peut avoir un mot de passe plus court que la regle actuelle, et le
 * refuser ici enfermerait la cliente dehors. On normalise seulement le
 * telephone, qui est la cle de recherche.
 */
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Le mot de passe est requis."),
});

/**
 * Mise a jour du profil depuis l'espace client.
 *
 * Le telephone n'est PAS modifiable ici : c'est l'identifiant de connexion et
 * la cle de rattachement des commandes. Le changer demande une verification
 * qui n'existe pas encore ; mieux vaut ne pas l'ouvrir que de l'ouvrir mal.
 */
export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Votre nom complet est requis.").max(80).optional(),
    email: emailSchema.nullable().optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: passwordSchema.optional(),
  })
  .strict()
  // Changer de mot de passe exige de prouver qu'on connait l'ancien : sinon un
  // navigateur laisse ouvert suffirait a prendre le compte definitivement.
  .refine((input) => !input.newPassword || Boolean(input.currentPassword), {
    message: "Saisissez votre mot de passe actuel pour en choisir un nouveau.",
    path: ["currentPassword"],
  });
