/*
  Warnings:

  - You are about to drop the column `comment` on the `asset_reports` table. All the data in the column will be lost.
  - You are about to drop the column `reported_date` on the `asset_reports` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `asset_reports` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "asset_reports" DROP CONSTRAINT "asset_reports_userId_fkey";

-- AlterTable
ALTER TABLE "asset_reports" DROP COLUMN "comment",
DROP COLUMN "reported_date",
DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "AssetReportUser" (
    "id" UUID NOT NULL,
    "reported_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "userId" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "assetReportId" UUID,

    CONSTRAINT "AssetReportUser_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssetReportUser" ADD CONSTRAINT "AssetReportUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReportUser" ADD CONSTRAINT "AssetReportUser_assetReportId_fkey" FOREIGN KEY ("assetReportId") REFERENCES "asset_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
