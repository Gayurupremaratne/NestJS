-- DropIndex
DROP INDEX "promotion_translations_locale_id_key";

-- DropIndex
DROP INDEX "promotion_translations_locale_id_promotion_id_key";

-- AlterTable
ALTER TABLE "promotion_translations" ADD CONSTRAINT "promotion_translations_pkey" PRIMARY KEY ("locale_id", "promotion_id");
