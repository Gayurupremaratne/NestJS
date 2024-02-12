-- AlterTable
ALTER TABLE "users" ALTER COLUMN "nationality_code" DROP NOT NULL,
ALTER COLUMN "country_code" DROP NOT NULL,
ALTER COLUMN "contact_number" DROP NOT NULL;
