/**
 * Purge des données laissées par les tests de bout en bout.
 *
 *   npm run db:purge-e2e
 *
 * Les scénarios Playwright créent de vraies lignes (produit, catégorie, compte,
 * commande) puis les suppriment. Quand un test échoue au milieu, l'objet reste.
 * Ce script retire CES restes-là, et rien d'autre : il ne cible que les noms
 * horodatés « … E2E-xxxxxxxx » produits par `e2e/helpers.ts` (`marque()`), plus
 * les essais manuels « CURLTEST- » / « FRESHTEST- ».
 *
 * Idempotent : on peut le relancer sans risque.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Marqueur commun à tout ce que les tests créent (nom horodaté). */
const E2E_MARKERS = ["E2E-", "CURLTEST-", "FRESHTEST-"];
const nameContainsMarker = E2E_MARKERS.map((contains) => ({ name: { contains } }));
const clientContainsMarker = E2E_MARKERS.map((contains) => ({ client: { contains } }));

async function main() {
  // 1. Commandes de test (les lignes de commande partent en cascade). Il faut
  //    les retirer d'abord : elles référencent des produits et des comptes.
  const orders = await prisma.order.deleteMany({ where: { OR: clientContainsMarker } });

  // 2. Comptes clients de test, désormais sans commande.
  const users = await prisma.user.deleteMany({
    where: { role: "CLIENT", OR: nameContainsMarker },
  });

  // 3. Produits de test (variantes, images, stock et mouvements en cascade).
  const products = await prisma.product.deleteMany({ where: { OR: nameContainsMarker } });

  // 4. Catégories de test, désormais sans produit.
  const categories = await prisma.category.deleteMany({ where: { OR: nameContainsMarker } });

  console.log(`Commandes de test supprimées   : ${orders.count}`);
  console.log(`Comptes de test supprimés       : ${users.count}`);
  console.log(`Produits de test supprimés      : ${products.count}`);
  console.log(`Catégories de test supprimées   : ${categories.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
