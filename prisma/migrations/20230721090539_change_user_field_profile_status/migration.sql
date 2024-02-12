/*
  Warnings:

  - You are about to drop the column `profile_partial_status` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "REGISTRATION_STATUS" AS ENUM ('INITIAL', 'SOCIAL_INITIAL', 'PENDING_VERIFICATION', 'VERIFIED', 'PENDING_COSENT', 'COMPLETE');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "profile_partial_status",
ADD COLUMN     "profile_status" "REGISTRATION_STATUS" NOT NULL DEFAULT 'INITIAL';
