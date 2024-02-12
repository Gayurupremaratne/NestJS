/*
  Warnings:

  - You are about to drop the column `asset_key_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[profile_image_key]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_asset_key_id_fkey";

-- DropIndex
DROP INDEX "users_asset_key_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "asset_key_id",
ADD COLUMN     "profile_image_key" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_profile_image_key_key" ON "users"("profile_image_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profile_image_key_fkey" FOREIGN KEY ("profile_image_key") REFERENCES "asset_keys"("fileKey") ON DELETE SET NULL ON UPDATE CASCADE;
