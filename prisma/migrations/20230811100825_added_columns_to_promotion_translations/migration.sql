/*
  Warnings:

  - Added the required column `cta_text` to the `promotion_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `promotion_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `promotion_translations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "promotion_translations" ADD COLUMN     "cta_text" VARCHAR(50) NOT NULL,
ADD COLUMN     "description" VARCHAR(255) NOT NULL,
ADD COLUMN     "title" VARCHAR(50) NOT NULL;
