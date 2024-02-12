/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `AssetReportUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AssetReportUser_userId_key" ON "AssetReportUser"("userId");
