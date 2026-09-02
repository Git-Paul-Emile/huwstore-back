/**
 * Catalogue réel HUWSTORE.
 *
 * Ce fichier est la traduction fidèle des fiches produits fournies par la
 * boutique : un objet TypeScript par article, avec ses déclinaisons couleur.
 * Il ne fait AUCUN accès base ni réseau - c'est de la donnée pure, que le seed
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
  /**
   * Le visuel n'est pas listé ici : il se déduit du slug, par convention
   * `front/public/univers/<slug>.webp`, et bascule sur son adresse Cloudinary
   * dès que `npm run media:upload` a tourné (voir `media.ts`).
   */
  /** Résumé affiché sous le nom sur la page d'accueil - deux lignes maximum. */
  description: string;
};

/** Entretien commun à tous les articles en toile - évite de répéter le texte. */
const ENTRETIEN_TOILE =
  "Pour préserver la qualité de la toile, ne pas laver en machine, ne pas laisser tremper et éviter les produits nettoyants trop agressifs, notamment le Madar. Nettoyer délicatement à l'aide d'un chiffon humide.";

/** Entretien commun aux articles en cuir polyurethane. */
const ENTRETIEN_CUIR_PU =
  "Nettoyer délicatement avec un chiffon doux et légèrement humide. Ne pas laver en machine, ne pas tremper et éviter les produits agressifs. Sécher à l'air libre, à l'abri du soleil et de toute source de chaleur.";

const ENTRETIEN_TOILE_SANS_TREMPAGE =
  "Pour préserver la qualité de la toile, ne pas laver en machine, éviter les produits nettoyants trop agressifs, notamment le Madar. Nettoyer délicatement à l'aide d'un chiffon humide.";

export const categories: CategorySeed[] = [
  {
    name: "Toile & Coton",
    slug: "toile-coton",
    position: 1,
    description: "Tote bags en toile de coton, zippés, assez larges pour un ordinateur.",
  },
  {
    name: "Fourre-tout",
    slug: "fourre-tout",
    position: 2,
    description: "Grands sacs en toile épaisse, portés main ou épaule, très spacieux.",
  },
  {
    name: "Oxford",
    slug: "oxford",
    position: 3,
    description: "Tissu Oxford imperméable, bandoulière ajustable et plusieurs poches.",
  },
  {
    name: "Cuir PU",
    slug: "cuir-pu",
    position: 4,
    description: "Sacs à main en cuir polyuréthane, patchwork de couleurs douces.",
  },
  {
    name: "Sacs à dos",
    slug: "sacs-a-dos",
    position: 5,
    description: "Sacs à dos en cuir polyuréthane, compartiment ordinateur et bretelles rembourrées.",
  },
  {
    name: "Voyage & maternité",
    slug: "voyage-maternite",
    position: 6,
    description: "Sacs de voyage en nylon léger, compartiment à chaussures et bandoulière ajustable.",
  },
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
    care: "Nettoyer délicatement avec un chiffon humide. Ne pas laver en machine et éviter les produits nettoyants agressifs.",
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

  {
    id: "tote-bag-toile-bandouliere",
    slug: "tote-bag-toile-bandouliere",
    name: "Tote bag élégant, spacieux et polyvalent",
    collection: "HUWSTORE",
    category: "Toile & Coton",
    material: "Toile",
    price: 6000,
    badge: "NOUVEAU",
    description:
      "Alliez style et praticité au quotidien avec ce tote bag en toile, au design épuré et intemporel. Son format généreux permet de transporter facilement vos essentiels, tandis que ses anses et sa bandoulière ajustable offrent plusieurs possibilités de port : à la main, à l'épaule ou en bandoulière.",
    care: ENTRETIEN_TOILE_SANS_TREMPAGE,
    widthTopMm: 400,
    heightMm: 350,
    depthMm: 100,
    handleDropMm: 150,
    weightGrams: 200,
    features: [
      "Bandoulière réglable de 100 cm",
      "Porté main, épaule ou bandoulière",
      "Format généreux",
      "Toile résistante",
    ],
    variants: [
      { colorName: "Noir", colorSlug: "noir", hex: "#1a1a1a" },
      { colorName: "Blanc cassé", colorSlug: "blanc-casse", hex: "#efe9dd" },
      { colorName: "Beige", colorSlug: "beige", hex: "#e0cfa8" },
    ],
  },
  {
    id: "cabas-bi-matiere-similicuir",
    slug: "cabas-bi-matiere-similicuir",
    name: "Sac cabas bi-matière toile et similicuir",
    collection: "HUWSTORE",
    category: "Toile & Coton",
    material: "Toile et similicuir",
    price: 9000,
    badge: "NOUVEAU",
    description:
      "Élégant et pratique, ce sac cabas bi-matière toile et similicuir séduit par son format moyen, ses finitions soignées et ses longues anses permettant un porté à la main ou à l'épaule. Idéal pour accompagner vos essentiels au quotidien, au travail comme en sortie.",
    care:
      "Nettoyer avec un chiffon doux légèrement humide. Éviter la machine à laver, l'immersion dans l'eau et les produits agressifs. Sécher naturellement, à l'abri du soleil direct.",
    closure: "Boucle",
    widthTopMm: 440,
    widthBottomMm: 360,
    heightMm: 270,
    depthMm: 140,
    handleDropMm: 260,
    weightGrams: 300,
    features: ["Bi-matière toile et similicuir", "Fermeture à boucle", "Longues anses de 26 cm", "Porté main ou épaule"],
    variants: [
      { colorName: "Gris", colorSlug: "gris", hex: "#8b8f94" },
      { colorName: "Beige", colorSlug: "beige", hex: "#cfc3ae" },
      { colorName: "Marron", colorSlug: "marron", hex: "#b07d55" },
    ],
  },
  {
    id: "cabas-cuir-pu",
    slug: "cabas-cuir-pu",
    name: "Sac cabas en cuir polyuréthane",
    collection: "HUWSTORE",
    category: "Cuir PU",
    material: "Cuir polyuréthane (PU)",
    price: 19000,
    badge: "NOUVEAU",
    description:
      "Élégant et fonctionnel, ce sac cabas en cuir PU séduit par son design structuré et ses finitions soignées. Son format généreux permet de ranger facilement vos essentiels du quotidien, tandis que ses longues anses offrent un porté confortable à la main ou à l'épaule. Son intérieur compartimenté facilite l'organisation de vos affaires.",
    care: ENTRETIEN_CUIR_PU,
    closure: "Zippée",
    widthTopMm: 410,
    widthBottomMm: 320,
    heightMm: 270,
    depthMm: 130,
    handleDropMm: 230,
    weightGrams: 600,
    features: [
      "Intérieur compartimenté",
      "Longues anses de 23 cm",
      "Porté main ou épaule",
      "Fermeture zippée",
    ],
    variants: [
      { colorName: "Noir", colorSlug: "noir", hex: "#1a1a1a" },
      { colorName: "Marron cognac", colorSlug: "cognac", hex: "#a35a2a" },
      { colorName: "Marron café", colorSlug: "marron-cafe", hex: "#5b3b26" },
    ],
  },
  {
    id: "cabas-multi-compartiments",
    slug: "cabas-multi-compartiments",
    name: "Sac cabas élégant multi-compartiments",
    collection: "HUWSTORE",
    category: "Cuir PU",
    material: "Cuir polyuréthane (PU)",
    price: 11000,
    badge: "NOUVEAU",
    description:
      "Alliez style et organisation avec ce sac cabas intemporel. Conçu pour les femmes actives, il offre un design épuré en cuir polyuréthane de haute qualité qui s'adapte à toutes vos tenues, du bureau aux sorties décontractées. Ses nombreux compartiments internes vous permettent de ranger facilement vos essentiels de manière ordonnée et sécurisée.",
    care: ENTRETIEN_CUIR_PU,
    closure: "Zippée",
    widthTopMm: 320,
    heightMm: 260,
    depthMm: 120,
    handleDropMm: 240,
    features: [
      "Nombreux compartiments internes",
      "Anses de 24 cm, porté épaule confortable",
      "Fermeture éclair",
      "Cuir PU de haute qualité",
    ],
    variants: [{ colorName: "Noir", colorSlug: "noir", hex: "#1a1a1a" }],
  },
  {
    id: "sac-a-dos-cuir-pu",
    slug: "sac-a-dos-cuir-pu",
    name: "Sac à dos multifonctionnel en cuir PU",
    collection: "HUWSTORE",
    category: "Sacs à dos",
    material: "Cuir polyuréthane (PU)",
    price: 12000,
    badge: "NOUVEAU",
    description:
      "Pratique, élégant et résistant, ce sac à dos est idéal pour le travail, les études et les déplacements. Son design est structuré et ses nombreux compartiments permettent de garder vos essentiels bien organisés, avec un espace dédié à l'ordinateur. Ses bretelles rembourrées assurent un port confortable au quotidien.",
    care: ENTRETIEN_CUIR_PU,
    capacity: "Ordinateur portable jusqu'à 15,6 pouces et tablette jusqu'à 7,9 pouces",
    widthTopMm: 270,
    heightMm: 390,
    depthMm: 120,
    weightGrams: 730,
    features: [
      "Compartiment ordinateur dédié",
      "Bretelles rembourrées",
      "Nombreux compartiments",
      "Cuir PU résistant",
    ],
    variants: [
      { colorName: "Noir", colorSlug: "noir", hex: "#1a1a1a" },
      { colorName: "Marron", colorSlug: "marron", hex: "#8a5a35" },
    ],
  },
  {
    id: "sac-voyage-sport-maternite",
    slug: "sac-voyage-sport-maternite",
    name: "Sac multifonctionnel voyage, sport et maternité",
    collection: "HUWSTORE",
    category: "Voyage & maternité",
    material: "Nylon",
    price: 12000,
    badge: "NOUVEAU",
    description:
      "Pratique et polyvalent, ce sac est idéal pour les petits voyages, la salle de sport ou comme sac de maternité. Confectionné en nylon, un tissu léger et résistant, il est conçu pour accompagner vos déplacements au quotidien. Il dispose d'une fermeture zippée à un curseur, d'une bandoulière ajustable, d'une poche latérale, d'un compartiment dédié aux chaussures et d'une petite poche intérieure pour garder vos essentiels bien organisés.",
    care:
      "Nettoyer délicatement avec un chiffon humide. Éviter le lavage en machine, les produits agressifs et le trempage prolongé.",
    closure: "Zippée, à un curseur",
    capacity: "Compartiment à chaussures, poche latérale et poche intérieure",
    widthTopMm: 435,
    heightMm: 225,
    depthMm: 240,
    handleDropMm: 100,
    weightGrams: 630,
    features: [
      "Compartiment dédié aux chaussures",
      "Bandoulière ajustable",
      "Poche latérale et poche intérieure",
      "Nylon léger et résistant",
    ],
    variants: [
      { colorName: "Noir", colorSlug: "noir", hex: "#1a1a1a" },
      { colorName: "Rose", colorSlug: "rose", hex: "#e8bcc4" },
      { colorName: "Gris", colorSlug: "gris", hex: "#9a9ea3" },
      { colorName: "Marron", colorSlug: "marron", hex: "#b08a63" },
    ],
  },
];

/** SKU déterministe : HUW-<PRODUIT>-<COULEUR>, en majuscules. */
export const skuOf = (productSlug: string, colorSlug: string) =>
  `HUW-${productSlug.toUpperCase()}-${colorSlug.toUpperCase()}`;

/** Stock initial appliqué à chaque variante - à ajuster depuis l'admin. */
export const INITIAL_STOCK = { qty: 10, threshold: 3 };
