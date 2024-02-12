-- CreateTable
CREATE TABLE "onboarding_guidelines" (
    "id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_guidelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_guideline_translations" (
    "content" TEXT NOT NULL,
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "onboarding_guideline_id" UUID NOT NULL,

    CONSTRAINT "onboarding_guideline_translations_pkey" PRIMARY KEY ("locale_id","onboarding_guideline_id")
);

-- AddForeignKey
ALTER TABLE "onboarding_guideline_translations" ADD CONSTRAINT "onboarding_guideline_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_guideline_translations" ADD CONSTRAINT "onboarding_guideline_translations_onboarding_guideline_id_fkey" FOREIGN KEY ("onboarding_guideline_id") REFERENCES "onboarding_guidelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
