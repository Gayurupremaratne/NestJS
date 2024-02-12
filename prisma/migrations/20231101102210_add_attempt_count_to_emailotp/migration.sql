-- AlterTable
ALTER TABLE "email_otps" ADD COLUMN     "confirmation_attempts" INTEGER NOT NULL DEFAULT 0;
