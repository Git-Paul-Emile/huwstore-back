import "dotenv/config";
// Doit rester le 2e import : Sentry doit s'initialiser avant Express et Prisma.
import "./instrument.js";
import { createApp, API_PREFIX } from "./config/app.js";
import { logger } from "./config/logger.js";
import { monitoring } from "./config/monitoring.js";
import { prisma } from "./config/database.js";
import { jobQueue } from "./queue/index.js";

monitoring.init();

const port = Number(process.env.PORT ?? 8000);
const app = createApp();

const server = app.listen(port, () => {
  logger.info({ port, base: API_PREFIX }, `API disponible sur http://localhost:${port}${API_PREFIX}`);
});

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
