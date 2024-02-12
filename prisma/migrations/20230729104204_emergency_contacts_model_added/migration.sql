-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emergency_contact_id" UUID;

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "country_code" VARCHAR(16) NOT NULL,
    "contact_number" VARCHAR(15) NOT NULL,
    "relationship" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_emergency_contact_id_fkey" FOREIGN KEY ("emergency_contact_id") REFERENCES "emergency_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
