/**
 * Transforme un libellé en identifiant d'URL : minuscules, sans accent,
 * sans caractère spécial. Extrait ici pour être réutilisable (produits,
 * catégories, variantes) plutôt que dupliqué dans chaque service.
 */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, "-et-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
