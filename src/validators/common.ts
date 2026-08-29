import { z } from "zod";

/**
 * Regles de saisie partagees par plusieurs formulaires.
 *
 * Elles vivent ici, et pas dans le validateur d'un module precis, parce qu'un
 * numero de telephone doit etre accepte et NORMALISE de la meme facon qu'on le
 * saisisse a l'inscription, dans le carnet d'adresses ou au moment de payer.
 * Sinon la meme cliente serait enregistree sous « 77 123 45 67 » puis
 * introuvable sous « 771234567 ».
 */

/**
 * Numero senegalais : 77/78/76/70/75 suivis de 7 chiffres. L'indicatif, les
 * espaces, les points et les tirets sont tolerES a la saisie puis retires : ce
 * qui part en base est toujours la forme compacte a 9 chiffres.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s.-]/g, ""))
  .refine((value) => /^(?:\+221|00221)?(7[05678])\d{7}$/.test(value), {
    message: "Numéro de téléphone sénégalais attendu, ex. 77 123 45 67.",
  })
  .transform((value) => value.replace(/^(?:\+221|00221)/, ""));

/**
 * Mot de passe. Huit caracteres minimum : c'est le plancher recommande par
 * l'OWASP, et le compte donne acces a l'historique d'achat et aux adresses.
 */
export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(72, "Le mot de passe ne peut pas dépasser 72 caractères.");

/** Adresse e-mail normalisee en minuscules : une seule forme en base. */
export const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide.");
