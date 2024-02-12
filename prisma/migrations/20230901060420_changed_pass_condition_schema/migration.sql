/*
  Warnings:

  - The primary key for the `pass_condition_translations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `pass_condition_id` on the `pass_condition_translations` table. All the data in the column will be lost.
  - You are about to drop the `pass_conditions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[order,locale_id]` on the table `pass_condition_translations` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `pass_condition_translations` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `order` to the `pass_condition_translations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pass_condition_translations" DROP CONSTRAINT "pass_condition_translations_pass_condition_id_fkey";

-- AlterTable
ALTER TABLE "pass_condition_translations" DROP CONSTRAINT "pass_condition_translations_pkey",
DROP COLUMN "pass_condition_id",
ADD COLUMN     "id" UUID NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL,
ADD CONSTRAINT "pass_condition_translations_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "pass_conditions";

-- CreateIndex
CREATE UNIQUE INDEX "pass_condition_translations_order_locale_id_key" ON "pass_condition_translations"("order", "locale_id");
