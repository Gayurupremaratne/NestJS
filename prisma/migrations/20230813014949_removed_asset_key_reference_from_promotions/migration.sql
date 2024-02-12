-- DropForeignKey
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_assetKeysId_fkey";

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_assetKeysId_fkey" FOREIGN KEY ("assetKeysId") REFERENCES "asset_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
