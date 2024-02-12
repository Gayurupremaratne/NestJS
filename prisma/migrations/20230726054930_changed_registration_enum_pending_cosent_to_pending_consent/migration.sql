/*
  Warnings:

  - The values [PENDING_COSENT] on the enum `REGISTRATION_STATUS` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "REGISTRATION_STATUS_new" AS ENUM ('INITIAL', 'SOCIAL_INITIAL', 'PENDING_VERIFICATION', 'VERIFIED', 'PENDING_CONSENT', 'COMPLETE');
ALTER TABLE "users" ALTER COLUMN "registration_status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "registration_status" TYPE "REGISTRATION_STATUS_new" USING ("registration_status"::text::"REGISTRATION_STATUS_new");
ALTER TYPE "REGISTRATION_STATUS" RENAME TO "REGISTRATION_STATUS_old";
ALTER TYPE "REGISTRATION_STATUS_new" RENAME TO "REGISTRATION_STATUS";
DROP TYPE "REGISTRATION_STATUS_old";
ALTER TABLE "users" ALTER COLUMN "registration_status" SET DEFAULT 'INITIAL';
COMMIT;
