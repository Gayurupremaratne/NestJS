-- AlterTable
ALTER TABLE "emergency_contacts" ADD COLUMN     "contact_number_nationality_code" VARCHAR(2) DEFAULT 'LK';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "contact_number_nationality_code" VARCHAR(2) DEFAULT 'LK';
