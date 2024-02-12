-- CreateTable
CREATE TABLE "stage_closure" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "closed_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_closure_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stage_closure" ADD CONSTRAINT "stage_closure_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
