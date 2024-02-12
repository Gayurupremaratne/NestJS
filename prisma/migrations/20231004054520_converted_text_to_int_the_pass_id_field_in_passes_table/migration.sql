/*
  Warnings:

  - The `pass_id` column on the `passes` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "passes" DROP COLUMN "pass_id",
ADD COLUMN     "pass_id" INTEGER;
