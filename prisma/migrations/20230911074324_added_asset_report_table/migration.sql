-- CreateEnum
CREATE TYPE "FILE_REPORT_STATUS" AS ENUM ('PENDING', 'RESOLVED', 'REMOVED');

-- CreateTable
CREATE TABLE "asset_reports" (
    "id" UUID NOT NULL,
    "reported_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "FILE_REPORT_STATUS" NOT NULL DEFAULT 'PENDING',
    "file_key" VARCHAR(255),
    "comment" TEXT,
    "userId" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_reports_file_key_key" ON "asset_reports"("file_key");

-- AddForeignKey
ALTER TABLE "asset_reports" ADD CONSTRAINT "asset_reports_file_key_fkey" FOREIGN KEY ("file_key") REFERENCES "asset_keys"("fileKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_reports" ADD CONSTRAINT "asset_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
