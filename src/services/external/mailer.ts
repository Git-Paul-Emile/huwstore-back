/**
 * Envoi d'e-mails, vu comme un PORT (rules/external-services.md).
 *
 * Le code métier ne connaît que l'interface `Mailer`. Le fournisseur (Resend
 * aujourd'hui, un autre demain) vit derrière un adaptateur interchangeable, et
 * la sélection se fait ici, au seul endroit qui importe le SDK.
 */
import { CircuitBreaker, resilient } from "../../lib/resilience.js";
import { logger } from "../../config/logger.js";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
};

export interface Mailer {
  /** Nom de l'implémentation, pour les journaux et la sonde de santé. */
  readonly name: string;
  send(message: MailMessage): Promise<void>;
  health(): { name: string; state: string; failures: number };
}

/**
 * Adaptateur de repli : n'envoie rien, journalise. Utilisé en développement et
 * quand `RESEND_API_KEY` est absente - l'absence de clé ne doit pas casser un
 * parcours de commande.
 */
export class LogMailer implements Mailer {
  readonly name = "log";

  async send(message: MailMessage): Promise<void> {
    logger.warn({ to: message.to, subject: message.subject }, "E-mail non envoyé (mailer=log)");
  }

  health() {
    return { name: this.name, state: "closed", failures: 0 };
  }
}

/** Adaptateur Resend, enveloppé de timeout + retry + circuit breaker. */
export class ResendMailer implements Mailer {
  readonly name = "resend";
  private readonly breaker = new CircuitBreaker("resend", { failureThreshold: 5, openMs: 30_000 });

  constructor(
    private readonly deps: {
      send: (message: MailMessage & { from: string }) => Promise<unknown>;
      from: string;
    },
  ) {}

  async send(message: MailMessage): Promise<void> {
    // Pas de retry ici : c'est la file de tâches qui rejoue les envois ratés.
    // L'adaptateur ne garde que le timeout et le disjoncteur.
    await resilient({ label: "resend.emails.send", timeoutMs: 8_000, breaker: this.breaker, retry: false }, () =>
      this.deps.send({ ...message, from: this.deps.from }),
    );
  }

  health() {
    const snapshot = this.breaker.snapshot();
    return { name: this.name, state: snapshot.state, failures: snapshot.failures };
  }
}

let instance: Mailer | undefined;

/** Composition : Resend si configuré, sinon repli journalisé. Mémoïsé. */
export async function getMailer(): Promise<Mailer> {
  if (instance) return instance;

  if (process.env.RESEND_API_KEY) {
    const { resend, RESEND_FROM_EMAIL } = await import("../../config/resend.js");
    instance = new ResendMailer({
      send: (message) => resend.emails.send(message),
      from: RESEND_FROM_EMAIL,
    });
  } else {
    instance = new LogMailer();
  }
  return instance;
}

/** Réservé aux tests : injecte un mailer et remet le cache à zéro. */
export function __setMailer(mailer: Mailer | undefined) {
  instance = mailer;
}
