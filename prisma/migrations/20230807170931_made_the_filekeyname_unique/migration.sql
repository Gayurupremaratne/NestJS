/*
  Warnings:

  - You are about to drop the `AssetKeys` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "AssetKeys";

-- CreateTable
CREATE TABLE "asset_keys" (
    "id" UUID NOT NULL,
    "fileKey" VARCHAR(255) NOT NULL,
    "module" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_keys_fileKey_key" ON "asset_keys"("fileKey");
