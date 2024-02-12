-- DropForeignKey
ALTER TABLE "stage_translations" DROP CONSTRAINT "stage_translations_locale_id_fkey";

-- DropForeignKey
ALTER TABLE "stage_translations" DROP CONSTRAINT "stage_translations_stage_id_fkey";

-- DropForeignKey
ALTER TABLE "user_favourite_stages" DROP CONSTRAINT "user_favourite_stages_stage_id_fkey";

-- DropForeignKey
ALTER TABLE "user_favourite_stages" DROP CONSTRAINT "user_favourite_stages_user_id_fkey";

-- AddForeignKey
ALTER TABLE "stage_translations" ADD CONSTRAINT "stage_translations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_translations" ADD CONSTRAINT "stage_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourite_stages" ADD CONSTRAINT "user_favourite_stages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourite_stages" ADD CONSTRAINT "user_favourite_stages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
