/**
 * Cache mémoire à durée de vie (rules/performance.md).
 *
 * Sans Redis : un simple `Map` avec expiration, suffisant pour des données
 * lues très souvent et modifiées rarement (les paramètres de la boutique, les
 * facettes du catalogue). Chaque instance vit dans un seul process ; si l'API
 * passe un jour à plusieurs instances, on remplace cette classe par un
 * adaptateur Redis sans toucher aux appelants.
 */
type Entry<T> = { value: T; expiresAt: number };

export class TtlCache {
  private readonly store = new Map<string, Entry<unknown>>();

  constructor(private readonly defaultTtlMs: number) {}

  /**
   * Renvoie la valeur en cache, ou l'obtient via `loader`, la mémorise et la
   * renvoie. Un seul point d'entrée pour éviter les oublis d'invalidation.
   */
  async remember<T>(key: string, loader: () => Promise<T>, ttlMs = this.defaultTtlMs): Promise<T> {
    const cached = this.store.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;

    const value = await loader();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  /** Oublie une clé (ou tout le cache) après une écriture. */
  invalidate(key?: string): void {
    if (key === undefined) this.store.clear();
    else this.store.delete(key);
  }
}
