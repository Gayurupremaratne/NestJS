-- CreateTable
CREATE TABLE "pass_inventories" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pass_inventories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pass_inventories" ADD CONSTRAINT "pass_inventories_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
