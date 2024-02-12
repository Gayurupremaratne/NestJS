-- CreateTable
CREATE TABLE "pass_conditions" (
    "id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pass_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pass_condition_translations" (
    "content" TEXT NOT NULL,
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "pass_condition_id" UUID NOT NULL,

    CONSTRAINT "pass_condition_translations_pkey" PRIMARY KEY ("locale_id","pass_condition_id")
);

-- CreateTable
CREATE TABLE "pass_condition_meta_translations" (
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "title" VARCHAR(50) NOT NULL,
    "subTitle" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "pass_conditions_order_key" ON "pass_conditions"("order");

-- CreateIndex
CREATE UNIQUE INDEX "pass_condition_meta_translations_locale_id_key" ON "pass_condition_meta_translations"("locale_id");

-- AddForeignKey
ALTER TABLE "pass_condition_translations" ADD CONSTRAINT "pass_condition_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pass_condition_translations" ADD CONSTRAINT "pass_condition_translations_pass_condition_id_fkey" FOREIGN KEY ("pass_condition_id") REFERENCES "pass_conditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pass_condition_meta_translations" ADD CONSTRAINT "pass_condition_meta_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE CASCADE ON UPDATE CASCADE;
