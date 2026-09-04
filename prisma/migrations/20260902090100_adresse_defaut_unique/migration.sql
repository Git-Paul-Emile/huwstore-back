-- Une seule adresse par defaut par client, garantie par la base (rules/database.md).
-- Prisma ne sait pas exprimer un index partiel dans schema.prisma : il est pose ici.

-- Etape 1 : normaliser l'existant. S'il reste plusieurs adresses isDefault pour
-- un meme client, on ne garde que la plus recemment modifiee.
UPDATE "Address" a
SET "isDefault" = false
WHERE a."isDefault" = true
  AND a."id" <> (
    SELECT b."id" FROM "Address" b
    WHERE b."userId" = a."userId" AND b."isDefault" = true
    ORDER BY b."updatedAt" DESC, b."id" ASC
    LIMIT 1
  );

-- Etape 2 : l'index partiel unique.
CREATE UNIQUE INDEX "Address_userId_default_key" ON "Address"("userId") WHERE "isDefault";
