/**
 * Catalogue réel HUWSTORE.
 *
 * Ce fichier est la traduction fidèle des fiches produits fournies par la
 * boutique : un objet TypeScript par article, avec ses déclinaisons couleur.
 * Il ne fait AUCUN accès base ni réseau — c'est de la donnée pure, que le seed
 * (prisma/seed.ts) se contente d'écrire. Séparer la donnée du script qui
 * l'insère permet de la relire, de la corriger et de la tester sans lancer
 * de migration.
 *
 * Conventions :
 *  - Prix en FCFA, entiers (jamais de flottant sur de la monnaie).
 *  - Dimensions en millimètres, poids en grammes : entiers là aussi.
 *  - `colorSlug` sert à la fois de clé d'URL, de clé de média (voir media.ts)
 *    et de composant du SKU. Il doit rester stable dans le temps.
 */

export type VariantSeed = {
  colorName: string;
  colorSlug: string;
  /** Pastille couleur affichée dans l'UI. */
  hex: string;
  /** Deuxième teinte des modèles bi-matière (pastille en dégradé). */
  hexSecondary?: string;
};

export type ProductSeed = {
  id: string;
  slug: string;
  name: string;
  collection: string;
  category: string;
  material: string;
  price: number;
  compareAt?: number;
  badge?: "NOUVEAU" | "PROMO";
  description: string;
  care: string;
  closure?: string;
  capacity?: string;
  widthTopMm?: number;
  widthBottomMm?: number;
  heightMm?: number;
  depthMm?: number;
  handleDropMm?: number;
  weightGrams?: number;
  features: string[];
  variants: VariantSeed[];
};

export type CategorySeed = {
  name: string;
  slug: string;
  position: number;
  /** Produit + clé de média dont la première photo sert de visuel de catégorie. */
  cover: { product: string; key: string };
};

/** Entretien commun à tous les articles en toile — évite de répéter le texte. */
const ENTRETIEN_TOILE =
  "Pour préserver la qualité de la toile, ne pas laver en machine, ne pas laisser tremper et éviter les produits nettoyants trop agressifs, notamment le Madar. Nettoyer délicatement à l'aide d'un chiffon humide.";

const ENTRETIEN_TOILE_SANS_TREMPAGE =
  "Pour préserver la qualité de la toile, ne pas laver en machine, éviter les produits nettoyants trop agressifs, notamment le Madar. Nettoyer délicatement à l'aide d'un chiffon humide.";

export const categories: CategorySeed[] = [
  { name: "Toile & Coton", slug: "toile-coton", position: 1, cover: { product: "tote-bag-coton-durable", key: "noir" } },
  { name: "Fourre-tout", slug: "fourre-tout", position: 2, cover: { product: "fourre-tout-toile-epaisse", key: "gris" } },
  { name: "Oxford", slug: "oxford", position: 3, cover: { product: "fourre-tout-oxford", key: "vert" } },
  { name: "Cuir PU", slug: "cuir-pu", position: 4, cover: { product: "sac-main-patchwork-pu", key: "bleu" } },
];

export const products: ProductSeed[] = [
  {
    id: "tote-bag-coton-durable",
    slug: "tote-bag-coton-durable",
    name: "Tote bag en toile de coton durable",
    collection: "HUWSTORE",
    category: "Toile & Coton",
    material: "Toile de coton",
    price: 6000,
    description:
      "Élégant, pratique et spacieux, ce tote bag en toile de coton durable est conçu pour vous accompagner au quotidien. Sa fermeture zippée assure une meilleure protection de vos effets personnels, tandis que son format généreux offre un espace de rangement optimisé, permettant d'y glisser facilement un ordinateur ainsi que vos essentiels du quotidien.",
    care: ENTRETIEN_TOILE,
    closure: "Zippée",
    capacity: "Peut contenir un ordinateur",
    widthTopMm: 440,
    widthBottomMm: 370,
    heightMm: 340,
    depthMm: 100,
    features: ["Fermeture zippée", "Compartiment pour ordinateur", "Toile de coton durable", "Format généreux"],
    variants: [
      { colorName: "Noir", colorSlug: "noir", hex: "#1a1a1a" },
      { colorName: "Marron", colorSlug: "marron", hex: "#7d6444" },
      { colorName: "Beige", colorSlug: "beige", hex: "#ece3d4" },
    ],
  },
  {
    id: "sac-main-patchwork-pu",
    slug: "sac-main-patchwork-pu",
    name: "Sac à main multicolore en cuir polyuréthane",
    collection: "HUWSTORE",
    category: "Cuir PU",
    material: "Cuir polyuréthane (PU)",
    price: 9000,
    description:
      "Apportez une touche moderne et élégante à vos tenues avec ce sac à main en patchwork de couleurs douces. Pratique et chic, il est parfait pour un usage quotidien.",
    care: "Nettoyer avec un chiffon doux légèrement humide. Ne pas laver en machine.",
    closure: "Zippée",
    widthTopMm: 395,
    widthBottomMm: 320,
    heightMm: 275,
    depthMm: 130,
    handleDropMm: 240,
    features: ["Patchwork de couleurs douces", "Fermeture zippée", "Anses de 24 cm", "Cuir PU souple"],
    variants: [
      { colorName: "Bleu", colorSlug: "bleu", hex: "#8fb4cc" },
      { colorName: "Jaune", colorSlug: "jaune", hex: "#c8913f" },
      { colorName: "Rose", colorSlug: "rose", hex: "#e6b3bf" },
    ],
  },
  {
    id: "fourre-tout-oxford",
    slug: "fourre-tout-oxford",
    name: "Fourre-tout en tissu Oxford imperméable",
    collection: "HUWSTORE",
    category: "Oxford",
    material: "Tissu Oxford imperméable",
    price: 9000,
    description:
      "Fourre-tout pratique et polyvalent en tissu Oxford imperméable. Son format généreux et ses différents espaces permettent d'organiser facilement vos essentiels du quotidien. Il peut être porté à la main ou à l'épaule grâce à sa bandoulière ajustable.",
    care:
      "Nettoyer délicatement avec un chiffon humide. Ne pas laver en machine et éviter les produits nettoyants agressifs.",
    widthTopMm: 380,
    heightMm: 280,
    depthMm: 140,
    handleDropMm: 240,
    weightGrams: 340,
    features: [
      "Tissu Oxford imperméable",
      "Porté main, épaule ou bandoulière",
      "Bandoulière ajustable",
      "Plusieurs poches de rangement",
    ],
    variants: [
      { colorName: "Noir", colorSlug: "noir", hex: "#1f2124" },
      { colorName: "Vert", colorSlug: "vert", hex: "#a9bfa0" },
      { colorName: "Beige", colorSlug: "beige", hex: "#e3d5bd" },
      { colorName: "Violet", colorSlug: "violet", hex: "#cfc6de" },
    ],
  },
  {
    id: "tote-bag-freedom",
    slug: "tote-bag-freedom",
    name: "Tote bag Freedom",
    collection: "HUWSTORE",
    category: "Toile & Coton",
    material: "Toile de coton",
    price: 4000,
    badge: "NOUVEAU",
    description:
      "Affirmez votre style avec le Tote Bag Freedom, un modèle à la fois tendance et pratique. Son design est rehaussé d'une petite peluche décorative, apportant une touche originale et décontractée à l'ensemble.",
    care: ENTRETIEN_TOILE,
    closure: "Zippée",
    capacity: "Peut contenir un ordinateur de taille moyenne",
    widthTopMm: 370,
    widthBottomMm: 340,
    heightMm: 320,
    handleDropMm: 240,
    weightGrams: 200,
    features: ["Peluche décorative", "Fermeture zippée", "Imprimé Freedom", "Toile de coton"],
    variants: [
      { colorName: "Noir", colorSlug: "noir", hex: "#1a1a1a" },
      { colorName: "Beige", colorSlug: "beige", hex: "#ece3d4" },
    ],
  },
  {
    id: "fourre-tout-toile-epaisse",
    slug: "fourre-tout-toile-epaisse",
    name: "Fourre-tout en toile épaisse",
    collection: "HUWSTORE",
    category: "Fourre-tout",
    material: "Toile épaisse",
    price: 10000,
    badge: "NOUVEAU",
    description:
      "Ce grand sac fourre-tout en toile de coton robuste allie élégance, confort et fonctionnalité. Ses doubles anses permettent un porté main ou épaule, tandis que son format spacieux s'adapte parfaitement au quotidien, au bureau, aux cours ou aux sorties.",
    care: ENTRETIEN_TOILE_SANS_TREMPAGE,
    closure: "Zippée",
    capacity: "Ordinateur, cahiers, trousse de maquillage…",
    widthTopMm: 455,
    widthBottomMm: 390,
    heightMm: 310,
    depthMm: 120,
    handleDropMm: 230,
    weightGrams: 210,
    features: ["Doubles anses, porté main ou épaule", "Une poche intérieure", "Grande capacité", "Fermeture zippée"],
    variants: [
      { colorName: "Gris", colorSlug: "gris", hex: "#b6ada0" },
      { colorName: "Noir", colorSlug: "noir", hex: "#1a1a1a" },
      { colorName: "Kaki", colorSlug: "kaki", hex: "#c3b49b" },
    ],
  },
  {
    id: "tote-bag-velours-cotele",
    slug: "tote-bag-velours-cotele",
    name: "Tote bag en toile & velours côtelé",
    collection: "HUWSTORE",
    category: "Toile & Coton",
    material: "Toile de coton résistante et détails en velours côtelé",
    price: 9000,
    badge: "NOUVEAU",
    description:
      "Sac cabas bi-matière à marguerite. Conçu en toile robuste, il se distingue par sa grande poche avant en velours côtelé rehaussée d'un délicat pin's marguerite. Idéal pour les cours, le travail ou les sorties quotidiennes, il marie parfaitement style casual et fonctionnalité.",
    care: ENTRETIEN_TOILE_SANS_TREMPAGE,
    closure: "Zippée",
    capacity: "Ordinateur, cahiers, gourde, trousse de maquillage…",
    widthTopMm: 400,
    heightMm: 300,
    depthMm: 100,
    handleDropMm: 270,
    weightGrams: 210,
    features: [
      "Grande poche avant en velours côtelé",
      "Pin's marguerite",
      "2 poches (intérieure et extérieure)",
      "Fermeture zippée",
      "Style casual, bohème chic",
    ],
    variants: [
      { colorName: "Noir & marron", colorSlug: "noir-marron", hex: "#1a1a1a", hexSecondary: "#8a6a4a" },
      { colorName: "Noir & blanc cassé", colorSlug: "noir-blanc-casse", hex: "#1a1a1a", hexSecondary: "#efe9dd" },
      { colorName: "Blanc cassé & marron", colorSlug: "blanc-casse-marron", hex: "#efe9dd", hexSecondary: "#8a6a4a" },
    ],
  },
];

/** SKU déterministe : HUW-<PRODUIT>-<COULEUR>, en majuscules. */
export const skuOf = (productSlug: string, colorSlug: string) =>
  `HUW-${productSlug.toUpperCase()}-${colorSlug.toUpperCase()}`;

/** Stock initial appliqué à chaque variante — à ajuster depuis l'admin. */
export const INITIAL_STOCK = { qty: 10, threshold: 3 };
