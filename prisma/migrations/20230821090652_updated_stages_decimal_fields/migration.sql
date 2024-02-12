/*
  Warnings:

  - You are about to alter the column `distance` on the `stages` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `DoublePrecision`.
  - You are about to alter the column `elevation_gain` on the `stages` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "stages" ALTER COLUMN "distance" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "elevation_gain" SET DATA TYPE DOUBLE PRECISION;
