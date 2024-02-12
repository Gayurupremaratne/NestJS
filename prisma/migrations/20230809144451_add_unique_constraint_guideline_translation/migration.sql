/*
  Warnings:

  - A unique constraint covering the columns `[order,locale_id]` on the table `onboarding_guideline_translations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "onboarding_guideline_translations_order_locale_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_guideline_translations_order_locale_id_key" ON "onboarding_guideline_translations"("order", "locale_id");
