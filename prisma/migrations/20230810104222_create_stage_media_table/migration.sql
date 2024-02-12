-- CreateEnum
CREATE TYPE "STAGE_MEDIA_TYPES" AS ENUM ('PHOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "stage_media" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "STAGE_MEDIA_TYPES" NOT NULL DEFAULT 'PHOTO',
    "media_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_media_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stage_media" ADD CONSTRAINT "stage_media_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_media" ADD CONSTRAINT "stage_media_media_key_fkey" FOREIGN KEY ("media_key") REFERENCES "asset_keys"("fileKey") ON DELETE RESTRICT ON UPDATE CASCADE;
