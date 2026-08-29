import "dotenv/config";
import { createApp, API_PREFIX } from "./config/app.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/database.js";

const port = Number(process.env.PORT ?? 8000);
const app = createApp();

const server = app.listen(port, () => {
  logger.info({ port, base: API_PREFIX }, `API disponible sur http://localhost:${port}${API_PREFIX}`);
});

/**
 * Arrêt propre. L'hébergeur envoie SIGTERM avant de couper le conteneur : on
 * laisse les requêtes en cours se terminer et on ferme la connexion à la base,
 * plutôt que d'interrompre une commande au milieu de sa transaction.
 */
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "Arrêt en cours");
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
}

process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "Promesse rejetée non gérée"));
process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Exception non interceptée");
  process.exit(1);
});
