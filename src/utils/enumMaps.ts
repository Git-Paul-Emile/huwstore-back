// Traduit les enums Prisma (stables, en anglais) vers les libellés FR utilisés par la maquette,
// et inversement - un seul point de vérité au lieu d'un switch dupliqué dans chaque service.
function createEnumMap<Enum extends string, Label extends string>(entries: [Enum, Label][]) {
  const toLabel = new Map(entries);
  const toEnum = new Map(entries.map(([e, l]) => [l, e]));
  return {
    label: (value: Enum) => toLabel.get(value)!,
    fromLabel: (label: Label) => toEnum.get(label)!,
  };
}

export const productBadgeMap = createEnumMap([
  ["NOUVEAU", "Nouveau"],
  ["PROMO", "Promo"],
  ["RUPTURE", "Rupture"],
] as const);

export const payStatusMap = createEnumMap([
  ["PAYE", "Payé"],
  ["EN_ATTENTE", "En attente"],
  ["ECHOUE", "Échoué"],
] as const);

/**
 * Aucun paiement ne transite par l'API : ni carte ni compte bancaire n'y est
 * jamais demande. Sur Dakar, la cliente choisit entre especes a la livraison
 * et mobile money ; hors Dakar, seul le mobile money est ouvert, paye
 * d'avance hors du site et verifie a la main par la boutique avant l'envoi
 * (voir `order.service.ts`, qui refuse "Espèces" hors Dakar).
 */
export const payMethodMap = createEnumMap([
  ["COD", "Espèces"],
  ["WAVE", "Wave"],
  ["ORANGE_MONEY", "Orange Money"],
] as const);

/** Moyens de paiement ouverts a la vente. */
export const PAY_METHODS_OFFERTS = ["Espèces", "Wave", "Orange Money"] as const;

export const deliveryModeMap = createEnumMap([
  ["DOMICILE", "Domicile"],
  ["POINT_RELAIS", "Point relais"],
] as const);

export const orderStatusMap = createEnumMap([
  ["EN_PREPARATION", "En préparation"],
  ["EXPEDIEE", "Expédiée"],
  ["EN_COURS_DE_LIVRAISON", "En cours de livraison"],
  ["LIVREE", "Livrée"],
  ["RETOURNEE", "Retournée"],
] as const);

export const bannerSlotMap = createEnumMap([
  // Conserves pour les bannieres creees avant : ni le hero ni la pop-up ne
  // s'affichent, et les validateurs refusent ces slots, mais une ligne restee
  // en base doit encore pouvoir etre lue et supprimee depuis le back-office.
  ["HERO", "Hero"],
  ["BANDEAU_PROMO", "Bandeau promo"],
  ["POPUP", "Pop-up"],
] as const);

export const bannerTargetMap = createEnumMap([
  ["TOUTES", "Toutes"],
  ["MOBILE", "Mobile"],
  ["DESKTOP", "Desktop"],
] as const);

export const bannerLinkTypeMap = createEnumMap([
  ["PATH", "Page libre"],
  ["CATEGORY", "Catégorie"],
  ["PRODUCT", "Produit"],
] as const);

export const promoTypeMap = createEnumMap([
  ["POURCENTAGE", "Pourcentage"],
  ["MONTANT_FIXE", "Montant fixe"],
  ["LIVRAISON_OFFERTE", "Livraison offerte"],
] as const);

export const stockMoveTypeMap = createEnumMap([
  ["ENTREE", "Entrée"],
  ["SORTIE", "Sortie"],
  ["AJUSTEMENT", "Ajustement"],
  ["VENTE", "Vente"],
] as const);

/** Listes de valeurs proposees a la saisie d'un produit (matiere, fermeture). */
export const productOptionKindMap = createEnumMap([
  ["MATIERE", "matiere"],
  ["FERMETURE", "fermeture"],
] as const);
