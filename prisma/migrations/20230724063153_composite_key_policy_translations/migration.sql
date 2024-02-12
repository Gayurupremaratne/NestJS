/*
  Warnings:

  - The primary key for the `policy_translations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `policy_translations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "policy_translations" DROP CONSTRAINT "policy_translations_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "policy_translations_pkey" PRIMARY KEY ("policy_id", "locale_id");
