-- AlterTable
ALTER TABLE "stages" ADD COLUMN     "cumulative_reviews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviews_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "stage_reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "review" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stage_reviews" ADD CONSTRAINT "stage_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_reviews" ADD CONSTRAINT "stage_reviews_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
