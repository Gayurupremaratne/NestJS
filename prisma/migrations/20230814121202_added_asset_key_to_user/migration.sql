-- AlterTable
ALTER TABLE "users" ADD COLUMN     "assetKeysId" UUID;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_assetKeysId_fkey" FOREIGN KEY ("assetKeysId") REFERENCES "asset_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
