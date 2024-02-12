-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "assetKeyId" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_translations" (
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "promotion_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_translations_pkey" PRIMARY KEY ("locale_id","promotion_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotions_assetKeyId_key" ON "promotions"("assetKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_translations_locale_id_key" ON "promotion_translations"("locale_id");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_assetKeyId_fkey" FOREIGN KEY ("assetKeyId") REFERENCES "asset_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_translations" ADD CONSTRAINT "promotion_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_translations" ADD CONSTRAINT "promotion_translations_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
