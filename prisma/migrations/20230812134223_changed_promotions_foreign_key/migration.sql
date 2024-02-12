/*
  Warnings:

  - You are about to drop the column `promotionsId` on the `asset_keys` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[assetKeysId]` on the table `promotions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assetKeysId` to the `promotions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "asset_keys" DROP CONSTRAINT "asset_keys_promotionsId_fkey";

-- DropIndex
DROP INDEX "asset_keys_promotionsId_key";

-- AlterTable
ALTER TABLE "asset_keys" DROP COLUMN "promotionsId";

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "assetKeysId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "promotions_assetKeysId_key" ON "promotions"("assetKeysId");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_assetKeysId_fkey" FOREIGN KEY ("assetKeysId") REFERENCES "asset_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
