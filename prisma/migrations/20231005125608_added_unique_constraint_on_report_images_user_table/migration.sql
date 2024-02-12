/*
  Warnings:

  - A unique constraint covering the columns `[userId,assetReportId]` on the table `AssetReportUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AssetReportUser_userId_assetReportId_key" ON "AssetReportUser"("userId", "assetReportId");
