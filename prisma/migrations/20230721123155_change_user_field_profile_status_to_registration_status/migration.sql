/*
  Warnings:

  - You are about to drop the column `profile_status` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "profile_status",
ADD COLUMN     "registration_status" "REGISTRATION_STATUS" NOT NULL DEFAULT 'INITIAL';
