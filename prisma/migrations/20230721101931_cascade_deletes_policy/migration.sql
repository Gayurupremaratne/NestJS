-- DropForeignKey
ALTER TABLE "policies" DROP CONSTRAINT "policies_parent_policy_id_fkey";

-- DropForeignKey
ALTER TABLE "policy_translations" DROP CONSTRAINT "policy_translations_policy_id_fkey";

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_parent_policy_id_fkey" FOREIGN KEY ("parent_policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_translations" ADD CONSTRAINT "policy_translations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
