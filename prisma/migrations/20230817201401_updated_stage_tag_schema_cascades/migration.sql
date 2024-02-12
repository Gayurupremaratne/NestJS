-- CreateTable
CREATE TABLE "stage_tags" (
    "id" UUID NOT NULL,
    "internal_description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_tag_translations" (
    "stage_tag_id" UUID NOT NULL,
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "stage_tag_translations_pkey" PRIMARY KEY ("stage_tag_id","locale_id")
);

-- CreateTable
CREATE TABLE "stage_tag_associations" (
    "stage_id" UUID NOT NULL,
    "stage_tag_id" UUID NOT NULL,

    CONSTRAINT "stage_tag_associations_pkey" PRIMARY KEY ("stage_id","stage_tag_id")
);

-- AddForeignKey
ALTER TABLE "stage_tag_translations" ADD CONSTRAINT "stage_tag_translations_stage_tag_id_fkey" FOREIGN KEY ("stage_tag_id") REFERENCES "stage_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_tag_translations" ADD CONSTRAINT "stage_tag_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_tag_associations" ADD CONSTRAINT "stage_tag_associations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_tag_associations" ADD CONSTRAINT "stage_tag_associations_stage_tag_id_fkey" FOREIGN KEY ("stage_tag_id") REFERENCES "stage_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
