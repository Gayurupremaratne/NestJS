-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noticeboard_id" UUID,
ADD COLUMN     "notification_type" "NOTICE_TYPE" NOT NULL DEFAULT 'NOTIFICATION';

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_noticeboard_id_fkey" FOREIGN KEY ("noticeboard_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
