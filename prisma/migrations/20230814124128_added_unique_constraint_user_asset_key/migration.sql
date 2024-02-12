/*
  Warnings:

  - A unique constraint covering the columns `[asset_key_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "users_asset_key_id_key" ON "users"("asset_key_id");
