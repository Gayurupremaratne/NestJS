/*
  Warnings:

  - The primary key for the `stage_translations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `localeCode` on the `stage_translations` table. All the data in the column will be lost.
  - You are about to drop the column `stageId` on the `stage_translations` table. All the data in the column will be lost.
  - Added the required column `stage_id` to the `stage_translations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "stage_translations" DROP CONSTRAINT "stage_translations_localeCode_fkey";

-- DropForeignKey
ALTER TABLE "stage_translations" DROP CONSTRAINT "stage_translations_stageId_fkey";

-- AlterTable
ALTER TABLE "stage_translations" DROP CONSTRAINT "stage_translations_pkey",
DROP COLUMN "localeCode",
DROP COLUMN "stageId",
ADD COLUMN     "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
ADD COLUMN     "stage_id" UUID NOT NULL,
ADD CONSTRAINT "stage_translations_pkey" PRIMARY KEY ("stage_id", "locale_id");

-- AddForeignKey
ALTER TABLE "stage_translations" ADD CONSTRAINT "stage_translations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_translations" ADD CONSTRAINT "stage_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
