import "dotenv/config";
// Doit rester le 2e import : Sentry doit s'initialiser avant Express et Prisma.
import "./instrument.js";
import { createApp, API_PREFIX } from "./config/app.js";
import { logger } from "./config/logger.js";
import { monitoring } from "./config/monitoring.js";
import { prisma } from "./config/database.js";
import { jobQueue } from "./queue/index.js";
import { env } from "./config/env.js";
import { refreshTokenRepository } from "./repositories/refreshToken.repository.js";

monitoring.init();

const port = env.PORT;
const app = createApp();

const server = app.listen(port, () => {
  logger.info({ port, base: API_PREFIX }, `API disponible sur http://localhost:${port}${API_PREFIX}`);
});

/**
 * Purge quotidienne des jetons de rafraîchissement expirés : la table ne garde
 * pas indéfiniment une ligne par connexion. `unref` pour que ce minuteur
 * n'empêche jamais l'arrêt du process.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  refreshTokenRepository
    .deleteExpired()
    .then((result) => result.count > 0 && logger.info({ deleted: result.count }, "Jetons expirés purgés"))
    .catch((err) => logger.error({ err }, "Purge des jetons expirés échouée"));
}, DAY_MS).unref();

/**
 * Arrêt propre. L'hébergeur envoie SIGTERM avant de couper le conteneur : on
 * cesse d'accepter des requêtes, on laisse la file de tâches se vider (les
 * e-mails en attente partent), on pousse les derniers événements vers Sentry,
 * puis on ferme la connexion à la base - plutôt que d'interrompre une commande
 * au milieu de sa transaction.
 */
let shuttingDown = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Arrêt en cours");
    server.close(async () => {
      await jobQueue.drain().catch((err) => logger.error({ err }, "File non vidée à l'arrêt"));
      await monitoring.flush();
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

process.on("unhandledRejection", (reason) => monitoring.captureException(reason, { source: "unhandledRejection" }));
process.on("uncaughtException", async (error) => {
  monitoring.captureException(error, { source: "uncaughtException" });
  await monitoring.flush();
  process.exit(1);
});
