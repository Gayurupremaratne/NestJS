-- CreateEnum
CREATE TYPE "STAGE_DIFFICULTY_TYPE" AS ENUM ('BEGINNER', 'MODERATE', 'ADVANCED');

-- CreateTable
CREATE TABLE "stages" (
    "id" UUID NOT NULL,
    "distance" DECIMAL NOT NULL,
    "estimated_duration" INTEGER NOT NULL,
    "open_time" TIMESTAMPTZ NOT NULL,
    "close_time" TIMESTAMPTZ NOT NULL,
    "elevation_gain" DECIMAL NOT NULL,
    "open" BOOLEAN NOT NULL DEFAULT false,
    "difficulty_type" "STAGE_DIFFICULTY_TYPE" NOT NULL DEFAULT 'BEGINNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_translations" (
    "id" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "localeCode" VARCHAR(2) NOT NULL,
    "number" INTEGER NOT NULL,
    "stage_head" VARCHAR(255) NOT NULL,
    "stage_tail" VARCHAR(255) NOT NULL,
    "city" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favourite_stages" (
    "user_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,

    CONSTRAINT "user_favourite_stages_pkey" PRIMARY KEY ("user_id","stage_id")
);

-- AddForeignKey
ALTER TABLE "stage_translations" ADD CONSTRAINT "stage_translations_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_translations" ADD CONSTRAINT "stage_translations_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourite_stages" ADD CONSTRAINT "user_favourite_stages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourite_stages" ADD CONSTRAINT "user_favourite_stages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
