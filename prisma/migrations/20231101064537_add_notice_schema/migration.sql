-- CreateEnum
CREATE TYPE "NOTICE_TYPE" AS ENUM ('EMAIL', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "DELIVERY_GROUP" AS ENUM ('ALL', 'STAGE');

-- CreateEnum
CREATE TYPE "NOTICE_STATUS" AS ENUM ('PENDING', 'PROCESSING', 'SENT');

-- CreateTable
CREATE TABLE "notices" (
    "id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "category" UUID,
    "type" "NOTICE_TYPE" NOT NULL DEFAULT 'EMAIL',
    "delivery_group" "DELIVERY_GROUP" NOT NULL DEFAULT 'ALL',
    "status" "NOTICE_STATUS" NOT NULL DEFAULT 'PENDING',
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_translations" (
    "notice_id" UUID NOT NULL,
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notice_translations_pkey" PRIMARY KEY ("notice_id","locale_id")
);

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_category_fkey" FOREIGN KEY ("category") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_translations" ADD CONSTRAINT "notice_translations_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_translations" ADD CONSTRAINT "notice_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;
