/*
  Warnings:

  - You are about to drop the column `assetKeyId` on the `promotions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[promotionsId]` on the table `asset_keys` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `promotionsId` to the `asset_keys` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_assetKeyId_fkey";

-- DropIndex
DROP INDEX "promotions_assetKeyId_key";

-- AlterTable
ALTER TABLE "asset_keys" ADD COLUMN     "promotionsId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "assetKeyId";

-- CreateIndex
CREATE UNIQUE INDEX "asset_keys_promotionsId_key" ON "asset_keys"("promotionsId");

-- AddForeignKey
ALTER TABLE "asset_keys" ADD CONSTRAINT "asset_keys_promotionsId_fkey" FOREIGN KEY ("promotionsId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
