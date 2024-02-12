/*
  Warnings:

  - You are about to drop the column `assetKeysId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profile_picture_key` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_assetKeysId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "assetKeysId",
DROP COLUMN "profile_picture_key",
ADD COLUMN     "asset_key_id" UUID;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_asset_key_id_fkey" FOREIGN KEY ("asset_key_id") REFERENCES "asset_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
