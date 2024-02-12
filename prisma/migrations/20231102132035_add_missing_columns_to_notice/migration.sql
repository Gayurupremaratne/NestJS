/*
  Warnings:

  - Added the required column `updated_by` to the `notices` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NOTICE_VALIDITY_PERIOD" AS ENUM ('YES', 'NO');

-- AlterTable
ALTER TABLE "notices" ADD COLUMN     "is_validity_period_defined" "NOTICE_VALIDITY_PERIOD" NOT NULL DEFAULT 'NO',
ADD COLUMN     "updated_by" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
