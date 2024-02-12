/*
  Warnings:

  - You are about to drop the column `asset_key_id` on the `badges` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[badge_key]` on the table `badges` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `badge_key` to the `badges` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "badges" DROP CONSTRAINT "badges_asset_key_id_fkey";

-- DropIndex
DROP INDEX "badges_asset_key_id_key";

-- AlterTable
ALTER TABLE "badges" DROP COLUMN "asset_key_id",
ADD COLUMN     "badge_key" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "badges_badge_key_key" ON "badges"("badge_key");

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_badge_key_fkey" FOREIGN KEY ("badge_key") REFERENCES "asset_keys"("fileKey") ON DELETE RESTRICT ON UPDATE CASCADE;
