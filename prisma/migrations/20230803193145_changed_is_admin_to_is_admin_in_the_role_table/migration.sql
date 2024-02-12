/*
  Warnings:

  - You are about to drop the column `is_admin` on the `roles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "roles" DROP COLUMN "is_admin",
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;
