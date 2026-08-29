/**
 * Point de collecte des erreurs (rules/observability.md).
 *
 * Tout le code passe par `captureException` plutôt que d'appeler le SDK
 * directement : changer d'outil (Datadog, GlitchTip…) ne touche que ce fichier.
 * L'initialisation vit dans `src/instrument.ts`, chargé avant tout le reste.
 */
import * as Sentry from "@sentry/node";
import { logger } from "./logger.js";
import { sentryEnabled } from "../instrument.js";

export const monitoring = {
  /** Appelée une fois au démarrage, pour tracer l'état du monitoring. */
  init(): void {
    logger.info(
      { sentry: sentryEnabled },
      sentryEnabled ? "Monitoring actif (Sentry)" : "Monitoring local (journaux seulement)",
    );
  },

  /** Enregistre une erreur inattendue : toujours dans les journaux, et dans Sentry si actif. */
  captureException(error: unknown, context: Record<string, unknown> = {}): void {
    logger.error({ err: error, ...context }, "Exception capturée");
    if (sentryEnabled) Sentry.captureException(error, { extra: context });
  },

  /** À appeler avant tout `process.exit()` : sinon les derniers événements sont perdus. */
  async flush(timeoutMs = 2000): Promise<void> {
    if (sentryEnabled) await Sentry.flush(timeoutMs);
  },

  get enabled(): boolean {
    return sentryEnabled;
  },
};
