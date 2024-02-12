-- AlterTable
ALTER TABLE "emergency_contacts" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "country_code" DROP NOT NULL,
ALTER COLUMN "contact_number" DROP NOT NULL,
ALTER COLUMN "relationship" DROP NOT NULL;
