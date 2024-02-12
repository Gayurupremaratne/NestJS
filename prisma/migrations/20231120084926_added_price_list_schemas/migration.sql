-- CreateEnum
CREATE TYPE "CURRENCY" AS ENUM ('USD', 'LKR');

-- CreateEnum
CREATE TYPE "NATIONALITY" AS ENUM ('LOCAL', 'FOREIGN');

-- CreateEnum
CREATE TYPE "AGE_GROUP" AS ENUM ('ADULT', 'CHILD');

-- CreateTable
CREATE TABLE "stage_base_prices" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "currency" "CURRENCY" NOT NULL DEFAULT 'USD',
    "nationality" "NATIONALITY" NOT NULL DEFAULT 'LOCAL',
    "ageGroup" "AGE_GROUP" NOT NULL DEFAULT 'ADULT',
    "price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_base_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_seasonal_price_groups" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_seasonal_price_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_seasonal_prices" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "stage_seasonal_price_group_id" UUID NOT NULL,
    "currency" "CURRENCY" NOT NULL DEFAULT 'USD',
    "nationality" "NATIONALITY" NOT NULL DEFAULT 'LOCAL',
    "ageGroup" "AGE_GROUP" NOT NULL DEFAULT 'ADULT',
    "price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_seasonal_prices_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stage_base_prices" ADD CONSTRAINT "stage_base_prices_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_seasonal_price_groups" ADD CONSTRAINT "stage_seasonal_price_groups_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_seasonal_prices" ADD CONSTRAINT "stage_seasonal_prices_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_seasonal_prices" ADD CONSTRAINT "stage_seasonal_prices_stage_seasonal_price_group_id_fkey" FOREIGN KEY ("stage_seasonal_price_group_id") REFERENCES "stage_seasonal_price_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
