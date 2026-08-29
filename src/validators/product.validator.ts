import { z } from "zod";

export const productBadgeLabel = z.enum(["Nouveau", "Promo", "Rupture"]);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexPattern = /^#[0-9a-fA-F]{6}$/;

export const variantSchema = z.object({
  sku: z.string().min(1).optional(),
  color: z.string().min(1, "Le nom de la couleur est requis."),
  colorSlug: z.string().regex(slugPattern, "Slug invalide (minuscules, chiffres et tirets)."),
  hex: z.string().regex(hexPattern, "Couleur hexadécimale attendue, ex. #1a1a1a."),
  hexSecondary: z.string().regex(hexPattern).optional(),
  images: z.array(z.string().min(1)).default([]),
  stockQty: z.number().int().nonnegative().default(0),
  stockThreshold: z.number().int().nonnegative().default(5),
});

/**
 * Déclinaison en MISE À JOUR. `id` présent = coloris existant (on modifie ses
 * libellés et sa galerie) ; `id` absent = nouveau coloris. La quantité en stock
 * n'y figure pas : elle se pilote depuis l'écran Stock, pour que chaque
 * variation laisse un mouvement tracé.
 */
export const variantUpdateSchema = z.object({
  id: z.string().min(1).optional(),
  color: z.string().min(1, "Le nom de la couleur est requis."),
  colorSlug: z.string().regex(slugPattern, "Slug invalide (minuscules, chiffres et tirets)."),
  hex: z.string().regex(hexPattern, "Couleur hexadécimale attendue, ex. #1a1a1a."),
  hexSecondary: z.string().regex(hexPattern).optional(),
  images: z.array(z.string().min(1)).default([]),
  stockThreshold: z.number().int().nonnegative().default(5),
});

export const productSchema = z
  .object({
    id: z.string().regex(slugPattern).optional(),
    slug: z.string().regex(slugPattern).optional(),
    name: z.string().min(1),
    collection: z.string().min(1),
    categoryId: z.string().min(1),
    material: z.string().min(1),
    description: z.string().min(1, "La description est requise."),
    care: z.string().min(1, "Les conseils d'entretien sont requis."),
    price: z.number().int().positive(),
    compareAt: z.number().int().positive().optional(),
    badge: productBadgeLabel.optional(),
    videoUrl: z.string().min(1).optional(),

    // Caractéristiques physiques, en millimètres et en grammes.
    closure: z.string().optional(),
    capacity: z.string().optional(),
    widthTopMm: z.number().int().positive().optional(),
    widthBottomMm: z.number().int().positive().optional(),
    heightMm: z.number().int().positive().optional(),
    depthMm: z.number().int().positive().optional(),
    handleDropMm: z.number().int().positive().optional(),
    weightGrams: z.number().int().positive().optional(),
    features: z.array(z.string().min(1)).default([]),
    /** Ex. "Livré avec une pochette assortie" - vide si le modèle n'a pas d'accessoire inclus. */
    includedAccessory: z.string().min(1).optional(),

    active: z.boolean().default(true),
    variants: z.array(variantSchema).min(1, "Au moins une déclinaison couleur est requise."),
  })
  // Un même coloris ne peut pas être déclaré deux fois : la contrainte existe
  // en base, on la refuse ici pour renvoyer une 400 lisible plutôt qu'une 500.
  .refine((input) => new Set(input.variants.map((v) => v.colorSlug)).size === input.variants.length, {
    message: "Deux déclinaisons partagent le même coloris.",
    path: ["variants"],
  })
  .refine((input) => input.compareAt === undefined || input.compareAt > input.price, {
    message: "Le prix barré doit être supérieur au prix de vente.",
    path: ["compareAt"],
  });

/**
 * Mise à jour d'une fiche produit. `variants`, s'il est fourni, décrit l'état
 * complet voulu des coloris : ceux absents de la liste sont archivés (jamais
 * supprimés - des commandes y font référence).
 */
export const productUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: z.string().regex(slugPattern).optional(),
    collection: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    material: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    care: z.string().min(1).optional(),
    price: z.number().int().positive().optional(),
    compareAt: z.number().int().positive().nullable().optional(),
    badge: productBadgeLabel.nullable().optional(),
    videoUrl: z.string().min(1).nullable().optional(),
    closure: z.string().nullable().optional(),
    capacity: z.string().nullable().optional(),
    widthTopMm: z.number().int().positive().nullable().optional(),
    widthBottomMm: z.number().int().positive().nullable().optional(),
    heightMm: z.number().int().positive().nullable().optional(),
    depthMm: z.number().int().positive().nullable().optional(),
    handleDropMm: z.number().int().positive().nullable().optional(),
    weightGrams: z.number().int().positive().nullable().optional(),
    features: z.array(z.string().min(1)).optional(),
    includedAccessory: z.string().min(1).nullable().optional(),
    active: z.boolean().optional(),
    variants: z
      .array(variantUpdateSchema)
      .min(1, "Au moins une déclinaison couleur est requise.")
      .refine((variants) => new Set(variants.map((v) => v.colorSlug)).size === variants.length, {
        message: "Deux déclinaisons partagent le même coloris.",
      })
      .optional(),
  })
  .strict();

/**
 * Query de collection : filtres, recherche, tri ET pagination.
 * Les valeurs par défaut sont posées ici pour que le service reçoive toujours
 * une requête complète, jamais des `undefined` à gérer.
 */
/**
 * Filtre multi-valeurs. La boutique laisse cocher plusieurs matieres ou
 * plusieurs coloris a la fois : le parametre accepte donc soit une valeur
 * ("cuir"), soit une liste separee par des virgules ("cuir,toile"), soit le
 * meme parametre repete (?material=cuir&material=toile), les trois formes
 * qu'un client HTTP peut naturellement produire.
 */
const csvList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const parts = (Array.isArray(value) ? value : value.split(",")).map((part) => part.trim()).filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  });

export const productListQuerySchema = z.object({
  category: csvList,
  material: csvList,
  color: csvList,
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(["featured", "best", "price-asc", "price-desc", "new"]).default("featured"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(24),
  // Vue admin : inclut aussi les produits désactivés/archivés.
  all: z.coerce.boolean().optional(),
});
