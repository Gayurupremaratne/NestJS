/*
  Warnings:

  - You are about to drop the column `apple_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `facebook_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `google_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `instagram_token` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "apple_token",
DROP COLUMN "facebook_token",
DROP COLUMN "google_token",
DROP COLUMN "instagram_token",
ADD COLUMN     "is_apple" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_facebook" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_google" BOOLEAN NOT NULL DEFAULT false;
