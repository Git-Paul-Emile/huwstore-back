/**
 * Purge des données de démonstration.
 *
 *   npm run db:purge-demo
 *
 * Les premiers seeds du projet inséraient de fausses clientes et de fausses
 * commandes pour remplir le tableau de bord. Elles faussent tout : le chiffre
 * d'affaires, le classement des sacs les plus vendus, le nombre de clientes.
 * Le seed ne les écrit plus ; ce script retire celles qui restent en base.
 *
 * Il est ciblé et idempotent : il ne touche QUE les enregistrements créés par
 * l'ancien seed (identifiants de commande « CMD-24xx » et les six numéros de
 * téléphone fictifs), jamais une vraie vente.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Numéros des clientes fictives de l'ancien seed, sous leurs deux écritures. */
const DEMO_PHONES = ["778124490", "774522180", "763301107", "709401233", "762188400", "775530210"].flatMap((phone) => [
  phone,
  `+221${phone}`,
]);

async function main() {
  const demoOrders = await prisma.order.findMany({
    where: { id: { startsWith: "CMD-" } },
    select: { id: true },
  });

  if (demoOrders.length > 0) {
    // Les lignes de commande partent en cascade ; les mouvements de stock liés
    // à ces ventes fictives sont retirés à part, sinon le stock resterait faux.
    await prisma.stockMovement.deleteMany({
      where: { reason: { in: demoOrders.map((order) => `Commande ${order.id}`) } },
    });
    await prisma.order.deleteMany({ where: { id: { in: demoOrders.map((o) => o.id) } } });
  }

  const { count: clients } = await prisma.user.deleteMany({
    where: { role: "CLIENT", phone: { in: DEMO_PHONES } },
  });

  console.log(`Commandes de démonstration supprimées : ${demoOrders.length}`);
  console.log(`Clientes de démonstration supprimées  : ${clients}`);
  console.log("Le tableau de bord ne reflète plus que l'activité réelle.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
