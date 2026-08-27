/*
  Warnings:

  - You are about to drop the column `color` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `imageAlt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `imageHover` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `StockMovement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[variantId]` on the table `Stock` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `care` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variantId` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variantId` to the `StockMovement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_productId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_productId_fkey";

-- DropIndex
DROP INDEX "Stock_productId_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "color" TEXT,
ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "color",
DROP COLUMN "image",
DROP COLUMN "imageAlt",
DROP COLUMN "imageHover",
ADD COLUMN     "capacity" TEXT,
ADD COLUMN     "care" TEXT NOT NULL,
ADD COLUMN     "closure" TEXT,
ADD COLUMN     "depthMm" INTEGER,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "handleDropMm" INTEGER,
ADD COLUMN     "heightMm" INTEGER,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "weightGrams" INTEGER,
ADD COLUMN     "widthBottomMm" INTEGER,
ADD COLUMN     "widthTopMm" INTEGER;

-- AlterTable
ALTER TABLE "Stock" DROP COLUMN "productId",
ADD COLUMN     "variantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "productId",
ADD COLUMN     "variantId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorSlug" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "hexSecondary" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_position_idx" ON "ProductVariant"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_colorSlug_key" ON "ProductVariant"("productId", "colorSlug");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductImage_variantId_position_idx" ON "ProductImage"("variantId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_position_idx" ON "Category"("position");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_variantId_key" ON "Stock"("variantId");

-- CreateIndex
CREATE INDEX "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
