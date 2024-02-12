-- CreateTable
CREATE TABLE "point_of_interest" (
    "id" UUID NOT NULL,
    "latitude" VARCHAR(20) NOT NULL,
    "longitude" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "media_key" VARCHAR(255) NOT NULL,

    CONSTRAINT "point_of_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_of_interest_stage" (
    "point_of_interest_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_of_interest_stage_pkey" PRIMARY KEY ("point_of_interest_id","stage_id")
);

-- CreateTable
CREATE TABLE "point_of_interest_translations" (
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "poi_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_of_interest_translations_pkey" PRIMARY KEY ("poi_id","locale_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "point_of_interest_media_key_key" ON "point_of_interest"("media_key");

-- AddForeignKey
ALTER TABLE "point_of_interest" ADD CONSTRAINT "point_of_interest_media_key_fkey" FOREIGN KEY ("media_key") REFERENCES "asset_keys"("fileKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_of_interest_stage" ADD CONSTRAINT "point_of_interest_stage_point_of_interest_id_fkey" FOREIGN KEY ("point_of_interest_id") REFERENCES "point_of_interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_of_interest_stage" ADD CONSTRAINT "point_of_interest_stage_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_of_interest_translations" ADD CONSTRAINT "point_of_interest_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_of_interest_translations" ADD CONSTRAINT "point_of_interest_translations_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "point_of_interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
