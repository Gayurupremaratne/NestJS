/*
  Warnings:

  - Added the required column `expired_at` to the `passes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "passes" ADD COLUMN     "expired_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "user_trail_tracking" (
    "passes_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "average_pace" DOUBLE PRECISION NOT NULL,
    "average_speed" DOUBLE PRECISION NOT NULL,
    "distance_traveled" DOUBLE PRECISION NOT NULL,
    "elevation_gain" DOUBLE PRECISION NOT NULL,
    "elevation_loss" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "total_time" DOUBLE PRECISION NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "completion" DOUBLE PRECISION NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "active_track" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_trail_tracking_pkey" PRIMARY KEY ("user_id","passes_id")
);

-- CreateTable
CREATE TABLE "user_trail_tracking_history" (
    "id" UUID NOT NULL,
    "passes_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "average_pace" DOUBLE PRECISION NOT NULL,
    "average_speed" DOUBLE PRECISION NOT NULL,
    "distance_traveled" DOUBLE PRECISION NOT NULL,
    "elevation_gain" DOUBLE PRECISION NOT NULL,
    "elevation_loss" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "total_time" DOUBLE PRECISION NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "completion" DOUBLE PRECISION NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_trail_tracking_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_trail_tracking_passes_id_key" ON "user_trail_tracking"("passes_id");

-- AddForeignKey
ALTER TABLE "user_trail_tracking" ADD CONSTRAINT "user_trail_tracking_passes_id_fkey" FOREIGN KEY ("passes_id") REFERENCES "passes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_trail_tracking" ADD CONSTRAINT "user_trail_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_trail_tracking_history" ADD CONSTRAINT "user_trail_tracking_history_passes_id_fkey" FOREIGN KEY ("passes_id") REFERENCES "passes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_trail_tracking_history" ADD CONSTRAINT "user_trail_tracking_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
