/**
 * Initialisation Sentry (rules/observability.md).
 *
 * Ce module DOIT être importé en tout premier dans `index.ts`, juste après
 * `dotenv/config` et avant Express et Prisma : c'est ce qui permet à Sentry
 * d'instrumenter automatiquement les requêtes HTTP et d'attacher le contexte de
 * la requête (méthode, route) aux erreurs capturées plus loin.
 *
 * Le DSN vient de l'environnement (rules/security.md) : pas de Sentry sans
 * `SENTRY_DSN`, et chaque environnement pointe sur son propre projet. Retirer
 * la variable de `.env` suffit à désactiver l'envoi en local.
 */
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Traces de performance : 100 % par défaut (faible trafic) ; abaisser via
    // SENTRY_TRACES_SAMPLE_RATE si le volume devient coûteux.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 1),
    // On n'envoie ni IP, ni en-têtes, ni corps de requête : les données des
    // clientes ne partent pas chez un tiers.
    sendDefaultPii: false,
  });
}

export const sentryEnabled = Boolean(dsn);
