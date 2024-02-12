-- CreateTable
CREATE TABLE "onboarding_meta_translations" (
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "title" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_meta_translations_locale_id_key" ON "onboarding_meta_translations"("locale_id");

-- AddForeignKey
ALTER TABLE "onboarding_meta_translations" ADD CONSTRAINT "onboarding_meta_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;
