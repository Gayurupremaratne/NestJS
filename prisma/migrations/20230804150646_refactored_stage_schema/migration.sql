/*
  Warnings:

  - You are about to drop the column `number` on the `stage_translations` table. All the data in the column will be lost.
  - Added the required column `number` to the `stages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "stage_translations" DROP COLUMN "number";

-- AlterTable
ALTER TABLE "stages" ADD COLUMN     "number" INTEGER NOT NULL DEFAULT 1;
