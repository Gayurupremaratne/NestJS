/*
  Warnings:

  - A unique constraint covering the columns `[number]` on the table `stages` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "stages_number_key" ON "stages"("number");
