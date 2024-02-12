/*
  Warnings:

  - You are about to drop the column `noticeboard_id` on the `notifications` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_noticeboard_id_fkey";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "noticeboard_id",
ADD COLUMN     "notice_id" UUID;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
