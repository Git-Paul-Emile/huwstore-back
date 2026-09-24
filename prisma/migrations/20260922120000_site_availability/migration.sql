ALTER TABLE "Setting"
ADD COLUMN "siteAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "unavailableMessage" TEXT;
