/*
  Warnings:

  - The primary key for the `onboarding_guideline_translations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `onboarding_guideline_translations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "onboarding_guideline_translations" DROP CONSTRAINT "onboarding_guideline_translations_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "onboarding_guideline_translations_pkey" PRIMARY KEY ("order", "locale_id");
