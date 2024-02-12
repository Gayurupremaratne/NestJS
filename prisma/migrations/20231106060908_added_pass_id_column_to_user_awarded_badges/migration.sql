-- AlterTable
ALTER TABLE "user_awarded_badges" ADD COLUMN     "pass_id" UUID;

-- AddForeignKey
ALTER TABLE "user_awarded_badges" ADD CONSTRAINT "user_awarded_badges_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "passes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
