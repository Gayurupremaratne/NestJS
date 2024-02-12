/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `policies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "slug" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "policies_slug_key" ON "policies"("slug");
