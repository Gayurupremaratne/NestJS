/*
  Warnings:

  - The primary key for the `onboarding_guideline_translations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `onboarding_guideline_translations` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "onboarding_guideline_translations" DROP CONSTRAINT "onboarding_guideline_translations_pkey",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "onboarding_guideline_translations_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "onboarding_guideline_translations_order_locale_id_idx" ON "onboarding_guideline_translations"("order", "locale_id");
