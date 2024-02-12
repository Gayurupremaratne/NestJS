/*
  Warnings:

  - The primary key for the `onboarding_guideline_translations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `onboarding_guideline_id` on the `onboarding_guideline_translations` table. All the data in the column will be lost.
  - You are about to drop the `onboarding_guidelines` table. If the table is not empty, all the data it contains will be lost.
  - The required column `id` was added to the `onboarding_guideline_translations` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `order` to the `onboarding_guideline_translations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "STAGE_MEDIA_TYPES" AS ENUM ('PHOTO', 'VIDEO');

-- DropForeignKey
ALTER TABLE "onboarding_guideline_translations" DROP CONSTRAINT "onboarding_guideline_translations_onboarding_guideline_id_fkey";

-- AlterTable
ALTER TABLE "onboarding_guideline_translations" DROP CONSTRAINT "onboarding_guideline_translations_pkey",
DROP COLUMN "onboarding_guideline_id",
ADD COLUMN     "id" UUID NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL,
ADD CONSTRAINT "onboarding_guideline_translations_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "onboarding_guidelines";
