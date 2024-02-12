/*
  Warnings:

  - Added the required column `stage_id` to the `user_awarded_badges` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_awarded_badges" ADD COLUMN     "stage_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "user_awarded_badges" ADD CONSTRAINT "user_awarded_badges_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
