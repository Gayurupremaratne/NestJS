-- DropForeignKey
ALTER TABLE "policy_translations" DROP CONSTRAINT "policy_translations_locale_id_fkey";

-- AddForeignKey
ALTER TABLE "policy_translations" ADD CONSTRAINT "policy_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;
