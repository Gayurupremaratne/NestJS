/*
  Warnings:

  - A unique constraint covering the columns `[order]` on the table `onboarding_guidelines` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "onboarding_guidelines_order_key" ON "onboarding_guidelines"("order");
