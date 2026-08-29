/**
 * File de tâches en mémoire (rules/async.md).
 *
 * Ce qui NE doit pas retarder la réponse HTTP - envoyer un e-mail, appeler un
 * service tiers - est empilé ici et traité en arrière-plan par un petit pool de
 * workers. On y trouve les garanties attendues d'une file :
 *  - idempotence : une clé déjà vue n'est jamais retraitée ;
 *  - retry avec backoff exponentiel sur les échecs transitoires ;
 *  - lettre morte : après le dernier échec, le job est journalisé, pas perdu ;
 *  - métriques : `stats()` alimente la sonde de santé.
 *
 * Ce n'est pas une file persistante : un redémarrage perd les jobs en attente.
 * C'est un compromis assumé pour rester sans Redis ; le jour où la durabilité
 * devient nécessaire, on remplace CE fichier par un adaptateur BullMQ sans
 * toucher aux appelants.
 */
import { withRetry, type RetryOptions } from "../lib/resilience.js";
import { logger } from "../config/logger.js";

export type JobHandler<Payload> = (payload: Payload) => Promise<void>;

type QueuedJob = {
  id: string;
  name: string;
  payload: unknown;
  idempotencyKey?: string;
  enqueuedAt: number;
};

export type QueueStats = {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  deadLettered: number;
  handlers: string[];
};

export type JobQueueOptions = {
  concurrency?: number;
  retry?: RetryOptions;
  /** Nombre de clés d'idempotence conservées (fenêtre glissante). */
  idempotencyWindow?: number;
};

export class JobQueue {
  private readonly handlers = new Map<string, JobHandler<never>>();
  private readonly waiting: QueuedJob[] = [];
  private readonly processedKeys = new Set<string>();
  private readonly concurrency: number;
  private readonly retry: RetryOptions;
  private readonly idempotencyWindow: number;

  private running = 0;
  private counters = { completed: 0, failed: 0, deadLettered: 0 };
  private sequence = 0;

  constructor(options: JobQueueOptions = {}) {
    this.concurrency = options.concurrency ?? 2;
    this.idempotencyWindow = options.idempotencyWindow ?? 500;
    this.retry = options.retry ?? { attempts: 4, baseDelayMs: 1_000, maxDelayMs: 30_000 };
  }

  /** Associe un type de job à son traitement. */
  register<Payload>(name: string, handler: JobHandler<Payload>): void {
    this.handlers.set(name, handler as JobHandler<never>);
  }

  /**
   * Empile un job. Retourne `false` si la clé d'idempotence a déjà été traitée
   * (ou est en attente), `true` si le job a bien été mis en file.
   */
  enqueue(name: string, payload: unknown, options: { idempotencyKey?: string } = {}): boolean {
    if (!this.handlers.has(name)) {
      logger.error({ job: name }, "Aucun handler enregistré pour ce job");
      return false;
    }

    const key = options.idempotencyKey;
    if (key && (this.processedKeys.has(key) || this.waiting.some((job) => job.idempotencyKey === key))) {
      logger.debug({ job: name, idempotencyKey: key }, "Job ignoré (déjà traité)");
      return false;
    }

    this.sequence += 1;
    this.waiting.push({
      id: `${name}-${this.sequence}`,
      name,
      payload,
      idempotencyKey: key,
      enqueuedAt: Date.now(),
    });
    queueMicrotask(() => this.pump());
    return true;
  }

  stats(): QueueStats {
    return {
      pending: this.waiting.length,
      active: this.running,
      completed: this.counters.completed,
      failed: this.counters.failed,
      deadLettered: this.counters.deadLettered,
      handlers: [...this.handlers.keys()],
    };
  }

  /** Vide la file en attendant la fin des jobs en cours. Utile à l'arrêt et aux tests. */
  async drain(): Promise<void> {
    while (this.waiting.length > 0 || this.running > 0) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  private pump(): void {
    while (this.running < this.concurrency && this.waiting.length > 0) {
      const job = this.waiting.shift()!;
      this.running += 1;
      void this.process(job).finally(() => {
        this.running -= 1;
        if (this.waiting.length > 0) queueMicrotask(() => this.pump());
      });
    }
  }

  private async process(job: QueuedJob): Promise<void> {
    const handler = this.handlers.get(job.name)!;
    try {
      await withRetry(() => handler(job.payload as never), {
        ...this.retry,
        onRetry: (error, attempt, delayMs) =>
          logger.warn({ job: job.name, attempt, delayMs, err: error }, "Job rejoué"),
      });
      this.counters.completed += 1;
      if (job.idempotencyKey) this.rememberKey(job.idempotencyKey);
      logger.info({ job: job.name, waitedMs: Date.now() - job.enqueuedAt }, "Job traité");
    } catch (error) {
      this.counters.failed += 1;
      this.counters.deadLettered += 1;
      // Lettre morte : on ne réessaie plus, mais on garde une trace exploitable.
      logger.error({ job: job.name, payload: job.payload, err: error }, "Job en échec définitif (lettre morte)");
    }
  }

  private rememberKey(key: string): void {
    this.processedKeys.add(key);
    if (this.processedKeys.size > this.idempotencyWindow) {
      const oldest = this.processedKeys.values().next().value;
      if (oldest !== undefined) this.processedKeys.delete(oldest);
    }
  }
}
