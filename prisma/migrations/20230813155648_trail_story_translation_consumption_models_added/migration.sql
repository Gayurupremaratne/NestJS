-- CreateEnum
CREATE TYPE "STAGE_STORY_CONSUMPTION_STATUS" AS ENUM ('UNPLAYED', 'PLAYING', 'PAUSED', 'PLAYED');

-- CreateTable
CREATE TABLE "stage_stories" (
    "id" UUID NOT NULL,
    "latitude" VARCHAR(20) NOT NULL,
    "longitude" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stage_id" UUID NOT NULL,

    CONSTRAINT "stage_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_story_translations" (
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "title" VARCHAR(255) NOT NULL,
    "audioKey" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stage_story_id" UUID NOT NULL,

    CONSTRAINT "stage_story_translations_pkey" PRIMARY KEY ("stage_story_id","locale_id")
);

-- CreateTable
CREATE TABLE "stage_stories_consumptions" (
    "stage_story_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "STAGE_STORY_CONSUMPTION_STATUS" NOT NULL DEFAULT 'UNPLAYED',
    "timestamp" VARCHAR(255),

    CONSTRAINT "stage_stories_consumptions_pkey" PRIMARY KEY ("stage_story_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stage_story_translations_audioKey_key" ON "stage_story_translations"("audioKey");

-- AddForeignKey
ALTER TABLE "stage_stories" ADD CONSTRAINT "stage_stories_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_story_translations" ADD CONSTRAINT "stage_story_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_story_translations" ADD CONSTRAINT "stage_story_translations_audioKey_fkey" FOREIGN KEY ("audioKey") REFERENCES "asset_keys"("fileKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_story_translations" ADD CONSTRAINT "stage_story_translations_stage_story_id_fkey" FOREIGN KEY ("stage_story_id") REFERENCES "stage_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_stories_consumptions" ADD CONSTRAINT "stage_stories_consumptions_stage_story_id_fkey" FOREIGN KEY ("stage_story_id") REFERENCES "stage_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_stories_consumptions" ADD CONSTRAINT "stage_stories_consumptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
