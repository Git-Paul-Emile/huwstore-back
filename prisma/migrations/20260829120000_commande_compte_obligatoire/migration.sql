-- Commande sans compte : supprimée. Toute commande est désormais rattachée à un
-- compte client, et le jeton de lecture anonyme (`publicToken`) disparaît.
--
-- Prod : s'il reste des commandes à `userId` NULL (commandes invité), l'ALTER
-- ci-dessous échouera volontairement. Les rattacher d'abord à un compte
-- (créer/retrouver le compte depuis le téléphone figé sur la commande) avant de
-- rejouer cette migration.

-- 1. Le jeton de lecture anonyme n'a plus de raison d'être.
DROP INDEX IF EXISTS "Order_publicToken_key";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "publicToken";

-- 2. `userId` devient obligatoire.
ALTER TABLE "Order" ALTER COLUMN "userId" SET NOT NULL;
