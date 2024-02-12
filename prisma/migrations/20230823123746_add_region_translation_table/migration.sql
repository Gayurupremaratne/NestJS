/*
  Warnings:

  - You are about to drop the column `name` on the `regions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "regions" DROP COLUMN "name";

-- CreateTable
CREATE TABLE "region_translations" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "region_translations_id_key" ON "region_translations"("id");

-- AddForeignKey
ALTER TABLE "region_translations" ADD CONSTRAINT "region_translations_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_translations" ADD CONSTRAINT "region_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
