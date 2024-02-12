/*
  Warnings:

  - You are about to drop the column `emergency_contact_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `emergency_contacts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_emergency_contact_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emergency_contact_id";

-- CreateIndex
CREATE UNIQUE INDEX "emergency_contacts_user_id_key" ON "emergency_contacts"("user_id");

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
