/*
  Warnings:

  - A unique constraint covering the columns `[latitude]` on the table `point_of_interest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[longitude]` on the table `point_of_interest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "point_of_interest" DROP CONSTRAINT "point_of_interest_media_key_fkey";

-- AlterTable
ALTER TABLE "point_of_interest" ALTER COLUMN "media_key" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "point_of_interest_latitude_key" ON "point_of_interest"("latitude");

-- CreateIndex
CREATE UNIQUE INDEX "point_of_interest_longitude_key" ON "point_of_interest"("longitude");

-- AddForeignKey
ALTER TABLE "point_of_interest" ADD CONSTRAINT "point_of_interest_media_key_fkey" FOREIGN KEY ("media_key") REFERENCES "asset_keys"("fileKey") ON DELETE SET NULL ON UPDATE CASCADE;
