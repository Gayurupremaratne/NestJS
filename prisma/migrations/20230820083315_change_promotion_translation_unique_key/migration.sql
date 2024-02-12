/*
  Warnings:

  - The primary key for the `promotion_translations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[locale_id,promotion_id]` on the table `promotion_translations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "promotion_translations" DROP CONSTRAINT "promotion_translations_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "promotion_translations_locale_id_promotion_id_key" ON "promotion_translations"("locale_id", "promotion_id");
