/*
  Warnings:

  - You are about to drop the column `user_id` on the `email_otps` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_email_otp_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_password_reset_otp_id_fkey";

-- AlterTable
ALTER TABLE "email_otps" DROP COLUMN "user_id",
ADD COLUMN     "emailVerifyUserId" UUID,
ADD COLUMN     "passwordResetUserId" UUID;

-- AddForeignKey
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_passwordResetUserId_fkey" FOREIGN KEY ("passwordResetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_emailVerifyUserId_fkey" FOREIGN KEY ("emailVerifyUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
