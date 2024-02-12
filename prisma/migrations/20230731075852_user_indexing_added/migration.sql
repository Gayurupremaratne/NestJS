/*
  Warnings:

  - You are about to drop the column `emailVerifyUserId` on the `email_otps` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetUserId` on the `email_otps` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "email_otps" DROP CONSTRAINT "email_otps_emailVerifyUserId_fkey";

-- DropForeignKey
ALTER TABLE "email_otps" DROP CONSTRAINT "email_otps_passwordResetUserId_fkey";

-- AlterTable
ALTER TABLE "email_otps" DROP COLUMN "emailVerifyUserId",
DROP COLUMN "passwordResetUserId",
ADD COLUMN     "email_verify_user_id" UUID,
ADD COLUMN     "password_reset_user_id" UUID;

-- CreateIndex
CREATE INDEX "users_id_email_idx" ON "users"("id", "email");

-- AddForeignKey
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_password_reset_user_id_fkey" FOREIGN KEY ("password_reset_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_email_verify_user_id_fkey" FOREIGN KEY ("email_verify_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
