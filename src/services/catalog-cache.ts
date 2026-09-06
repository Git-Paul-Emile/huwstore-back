import { TtlCache } from "../lib/cache.js";

/**
 * Cache de lecture du catalogue public : listes de produits, facettes,
 * vignettes des univers. Ces réponses sont identiques d'une visiteuse à
 * l'autre et changent seulement quand la boutique modifie son catalogue.
 *
 * Durée de vie courte (60 s) : même si une invalidation était oubliée, une
 * donnée périmée ne le reste jamais plus d'une minute.
 *
 * Invalidation : `catalogCache.invalidate()` est appelé par CHAQUE écriture qui
 * touche au catalogue - produit, catégorie, stock, et création de commande
 * (qui décrémente le stock). L'invalidation est volontairement globale : le
 * gain d'une invalidation fine ne vaut pas le risque d'en oublier une branche.
 */
export const catalogCache = new TtlCache(60_000);

/** Clé stable pour une requête de liste : l'ordre des filtres n'influe pas. */
export function catalogKey(prefix: string, params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? [...value].sort().join("+") : String(value)}`);
  return `${prefix}:${parts.join("&")}`;
}
