/*
  Warnings:

  - You are about to drop the column `assetKeysId` on the `promotions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[media_key]` on the table `promotions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `media_key` to the `promotions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_assetKeysId_fkey";

-- DropIndex
DROP INDEX "promotions_assetKeysId_key";

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "assetKeysId",
ADD COLUMN     "media_key" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "promotions_media_key_key" ON "promotions"("media_key");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_media_key_fkey" FOREIGN KEY ("media_key") REFERENCES "asset_keys"("fileKey") ON DELETE RESTRICT ON UPDATE CASCADE;
