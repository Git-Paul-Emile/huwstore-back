import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const bannerSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est requis.").max(80),
    /** Deuxieme ligne du titre, affichee en italique. */
    subtitle: optionalText(80),
    text: optionalText(240),
    ctaLabel: optionalText(40),
    /** Lien interne du bouton : on refuse une URL externe, qui ferait sortir de la boutique. */
    ctaHref: z
      .string()
      .trim()
      .max(200)
      .transform((value) => (value.length === 0 ? null : value))
      .nullable()
      .optional()
      .refine((value) => value == null || value.startsWith("/"), {
        message: "Le lien doit être une page du site, ex. /boutique.",
      }),
    slot: z.enum(["Hero", "Bandeau promo", "Pop-up"]),
    target: z.enum(["Toutes", "Mobile", "Desktop"]).default("Toutes"),
    focus: z.enum(["center", "top", "bottom"]).default("center"),
    position: z.number().int().nonnegative().default(0),
    start: z.coerce.date(),
    end: z.coerce.date(),
    active: z.boolean().default(true),
    image: z.string().trim().min(1, "Une image est requise."),
  })
  // Une fenetre de diffusion inversee n'afficherait jamais la banniere : autant
  // le dire au moment de la saisie plutot que de laisser la boutique chercher.
  .refine((input) => input.end > input.start, {
    message: "La date de fin doit être postérieure à la date de début.",
    path: ["end"],
  });

export const bannerUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    subtitle: optionalText(80),
    text: optionalText(240),
    ctaLabel: optionalText(40),
    ctaHref: optionalText(200),
    slot: z.enum(["Hero", "Bandeau promo", "Pop-up"]).optional(),
    target: z.enum(["Toutes", "Mobile", "Desktop"]).optional(),
    focus: z.enum(["center", "top", "bottom"]).optional(),
    position: z.number().int().nonnegative().optional(),
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
    active: z.boolean().optional(),
    image: z.string().trim().min(1).optional(),
  })
  .strict();

/** Filtre de la liste publique : on ne demande qu'un emplacement. */
export const bannerListQuerySchema = z.object({
  slot: z.enum(["Hero", "Bandeau promo", "Pop-up"]).optional(),
  /** Vue back-office : inclut les bannieres inactives ou hors fenetre. */
  all: z.coerce.boolean().optional(),
});
