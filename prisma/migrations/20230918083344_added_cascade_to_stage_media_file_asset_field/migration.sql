-- DropForeignKey
ALTER TABLE "stage_media" DROP CONSTRAINT "stage_media_media_key_fkey";

-- AddForeignKey
ALTER TABLE "stage_media" ADD CONSTRAINT "stage_media_media_key_fkey" FOREIGN KEY ("media_key") REFERENCES "asset_keys"("fileKey") ON DELETE CASCADE ON UPDATE CASCADE;
