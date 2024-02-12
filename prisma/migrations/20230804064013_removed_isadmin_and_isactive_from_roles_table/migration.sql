/*
  Warnings:

  - You are about to drop the column `isActive` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `isAdmin` on the `roles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "roles" DROP COLUMN "isActive",
DROP COLUMN "isAdmin";
