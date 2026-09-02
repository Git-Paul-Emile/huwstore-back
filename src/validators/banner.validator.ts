import { z } from "zod";

/**
 * Emplacements qu'une banniere peut occuper : il n'en reste qu'un.
 *
 * « Hero » est parti avec la refonte du bloc d'accueil - celui-ci est desormais
 * un aplat blanc casse au contenu fixe, il ne lit plus aucune banniere - et
 * « Pop-up » avec lui, faute d'avoir jamais ete affichee. Les deux valeurs
 * restent dans l'enum Prisma (BannerSlot.HERO, BannerSlot.POPUP) pour ne pas
 * casser les lignes deja en base, mais on n'en accepte plus de nouvelle : un
 * emplacement qui ne s'affiche nulle part est un piege pour la boutique, qui
 * croirait avoir publie une campagne.
 */
export const BANNER_SLOTS = ["Bandeau promo"] as const;

/**
 * Destination du bouton. « Page libre » garde le champ chemin (ctaHref) saisi
 * a la main ; « Categorie » et « Produit » attendent une cible du catalogue,
 * dont le serveur deduit l'URL. Un seul des trois est renseigne a la fois.
 */
export const BANNER_LINK_TYPES = ["Page libre", "Catégorie", "Produit"] as const;

const optionalId = z.string().trim().min(1).nullable().optional();

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
    linkType: z.enum(BANNER_LINK_TYPES).default("Page libre"),
    linkCategoryId: optionalId,
    linkProductId: optionalId,
    slot: z.enum(BANNER_SLOTS),
    target: z.enum(["Toutes", "Mobile", "Desktop"]).default("Toutes"),
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
  })
  .superRefine(assertLinkTarget);

/**
 * Chaque campagne pointe vers une destination, jamais vide : selon linkType, on
 * exige le chemin libre, la categorie, ou le produit. L'existence de la cible
 * en base est verifiee par le service, pas ici.
 */
function assertLinkTarget(
  input: { linkType: (typeof BANNER_LINK_TYPES)[number]; ctaHref?: string | null; linkCategoryId?: string | null; linkProductId?: string | null },
  ctx: z.RefinementCtx,
) {
  if (input.linkType === "Catégorie" && !input.linkCategoryId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["linkCategoryId"], message: "Choisissez la catégorie vers laquelle mène le bouton." });
  }
  if (input.linkType === "Produit" && !input.linkProductId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["linkProductId"], message: "Choisissez le produit vers lequel mène le bouton." });
  }
  if (input.linkType === "Page libre" && !input.ctaHref) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ctaHref"], message: "Indiquez la page vers laquelle mène le bouton, ex. /boutique." });
  }
}

export const bannerUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    subtitle: optionalText(80),
    text: optionalText(240),
    ctaLabel: optionalText(40),
    ctaHref: optionalText(200),
    linkType: z.enum(BANNER_LINK_TYPES).optional(),
    linkCategoryId: optionalId,
    linkProductId: optionalId,
    slot: z.enum(BANNER_SLOTS).optional(),
    target: z.enum(["Toutes", "Mobile", "Desktop"]).optional(),
    position: z.number().int().nonnegative().optional(),
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
    active: z.boolean().optional(),
    image: z.string().trim().min(1).optional(),
  })
  .strict();

/** Filtre de la liste publique : on ne demande qu'un emplacement. */
export const bannerListQuerySchema = z.object({
  slot: z.enum(BANNER_SLOTS).optional(),
  /** Vue back-office : inclut les bannieres inactives ou hors fenetre. */
  all: z.coerce.boolean().optional(),
});
