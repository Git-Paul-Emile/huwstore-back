/**
 * Résilience des appels sortants (rules/async.md).
 *
 * Trois garde-fous, composés par la façade `resilient()` :
 *  1. Timeout    - aucun appel externe ne bloque indéfiniment.
 *  2. Retry      - on rejoue les échecs transitoires, avec un délai qui croît
 *                  exponentiellement et un peu de hasard (jitter) pour ne pas
 *                  marmarteler le fournisseur à la même milliseconde.
 *  3. Circuit    - quand un fournisseur tombe, on arrête de l'appeler pendant un
 *                  moment plutôt que d'empiler des requêtes qui échoueront.
 *
 * Volontairement sans dépendance : le besoin tient en un fichier, et le jour où
 * l'on passe à une vraie librairie (opossum, cockatiel), seul CE fichier change.
 */

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} : délai de ${ms} ms dépassé`);
    this.name = "TimeoutError";
  }
}

export class CircuitOpenError extends Error {
  constructor(label: string) {
    super(`${label} : circuit ouvert, appel court-circuité`);
    this.name = "CircuitOpenError";
  }
}

/**
 * Rejette après `ms` si l'opération n'a pas rendu la main. Un `AbortSignal` est
 * fourni à l'opération : les clients qui le supportent (fetch) coupent alors
 * réellement la connexion au lieu de la laisser filer en arrière-plan.
 */
export async function withTimeout<T>(
  label: string,
  ms: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_resolve, reject) => {
        controller.signal.addEventListener("abort", () => reject(new TimeoutError(label, ms)), { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export type RetryOptions = {
  /** Nombre total de tentatives, la première comprise. */
  attempts?: number;
  /** Délai avant la 1re nouvelle tentative ; double à chaque échec suivant. */
  baseDelayMs?: number;
  /** Plafond du délai entre deux tentatives. */
  maxDelayMs?: number;
  /** Renvoie `false` pour ne PAS rejouer (erreur définitive, ex. 4xx métier). */
  retryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 300;
  const maxDelayMs = options.maxDelayMs ?? 5_000;
  const retryable = options.retryable ?? (() => true);

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !retryable(error)) break;

      // Backoff exponentiel : base, 2×base, 4×base… plafonné, plus un jitter
      // aléatoire jusqu'à 50 % pour désynchroniser les clients concurrents.
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delayMs = Math.round(backoff * (0.5 + Math.random() * 0.5));
      options.onRetry?.(error, attempt, delayMs);
      await wait(delayMs);
    }
  }
  throw lastError;
}

type CircuitState = "closed" | "open" | "half-open";

export type CircuitBreakerOptions = {
  /** Échecs consécutifs avant ouverture du circuit. */
  failureThreshold?: number;
  /** Durée pendant laquelle le circuit reste ouvert avant un essai prudent. */
  openMs?: number;
};

/**
 * Disjoncteur. Tant qu'il est fermé, tout passe. Après `failureThreshold`
 * échecs de suite il s'ouvre : les appels suivants échouent immédiatement
 * (`CircuitOpenError`) sans toucher le fournisseur. Passé `openMs`, il laisse
 * passer UN appel d'essai ; s'il réussit, le circuit se referme.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private openedAt = 0;
  private readonly failureThreshold: number;
  private readonly openMs: number;

  constructor(
    private readonly label: string,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.openMs = options.openMs ?? 30_000;
  }

  snapshot() {
    return { label: this.label, state: this.state, failures: this.failures };
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt < this.openMs) throw new CircuitOpenError(this.label);
      this.state = "half-open";
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}

export type ResilientOptions = {
  label: string;
  timeoutMs?: number;
  retry?: RetryOptions | false;
  breaker?: CircuitBreaker;
};

/**
 * Façade : `circuit( retry( timeout( appel ) ) )`. Un seul point d'entrée pour
 * les adaptateurs de services externes.
 */
export function resilient<T>(options: ResilientOptions, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const call = () => withTimeout(options.label, timeoutMs, operation);
  const retryOptions = options.retry === false ? undefined : options.retry;
  const withRetries = options.retry === false ? call : () => withRetry(call, retryOptions);
  return options.breaker ? options.breaker.run(withRetries) : withRetries();
}
