-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL
);

-- CreateTable
CREATE TABLE "stage_regions" (
    "stage_id" UUID NOT NULL,
    "region_id" INTEGER NOT NULL,

    CONSTRAINT "stage_regions_pkey" PRIMARY KEY ("stage_id","region_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_id_key" ON "regions"("id");

-- AddForeignKey
ALTER TABLE "stage_regions" ADD CONSTRAINT "stage_regions_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_regions" ADD CONSTRAINT "stage_regions_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
