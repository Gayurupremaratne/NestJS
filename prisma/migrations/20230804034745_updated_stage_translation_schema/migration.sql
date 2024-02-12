/*
  Warnings:

  - The primary key for the `stage_translations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `stage_translations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stage_translations" DROP CONSTRAINT "stage_translations_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "stage_translations_pkey" PRIMARY KEY ("stageId", "localeCode");
