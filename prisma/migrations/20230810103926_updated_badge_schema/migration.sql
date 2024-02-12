-- CreateEnum
CREATE TYPE "BADGE_TYPES" AS ENUM ('STAGE_COMPLETION', 'MANUAL');

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL,
    "asset_key_id" UUID NOT NULL,
    "type" "BADGE_TYPES" NOT NULL DEFAULT 'MANUAL',
    "stage_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_translations" (
    "badge_id" UUID NOT NULL,
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badge_translations_pkey" PRIMARY KEY ("badge_id","locale_id")
);

-- CreateTable
CREATE TABLE "user_awarded_badges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_awarded_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "badges_asset_key_id_key" ON "badges"("asset_key_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_stage_id_key" ON "badges"("stage_id");

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_asset_key_id_fkey" FOREIGN KEY ("asset_key_id") REFERENCES "asset_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_translations" ADD CONSTRAINT "badge_translations_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_translations" ADD CONSTRAINT "badge_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_awarded_badges" ADD CONSTRAINT "user_awarded_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_awarded_badges" ADD CONSTRAINT "user_awarded_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
