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
 * La boutique encaisse a la livraison, en especes, et rien d'autre : pas de
 * paiement en ligne, pas de coordonnees bancaires collectees. L'enum ne porte
 * donc qu'une seule valeur - un moyen de paiement present en base mais jamais
 * ouvert serait une promesse que l'interface finirait par afficher.
 */
export const payMethodMap = createEnumMap([["COD", "Paiement à la livraison"]] as const);

/** Moyens de paiement ouverts a la vente. */
export const PAY_METHODS_OFFERTS = ["Paiement à la livraison"] as const;

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
  ["HERO", "Hero"],
  ["BANDEAU_PROMO", "Bandeau promo"],
  ["POPUP", "Pop-up"],
] as const);

export const bannerTargetMap = createEnumMap([
  ["TOUTES", "Toutes"],
  ["MOBILE", "Mobile"],
  ["DESKTOP", "Desktop"],
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
