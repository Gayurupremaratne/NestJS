/*
  Warnings:

  - You are about to drop the column `name` on the `roles` table. All the data in the column will be lost.
  - Added the required column `role_name` to the `roles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "roles" DROP COLUMN "name",
ADD COLUMN     "role_name" VARCHAR(255) NOT NULL;
