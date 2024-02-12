-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "order" SMALLINT NOT NULL,
    "parent_policy_id" UUID,
    "acceptance_required" BOOLEAN NOT NULL DEFAULT false,
    "icon" VARCHAR(255) NOT NULL,
    "is_group_parent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_translations" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "title" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_translations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_parent_policy_id_fkey" FOREIGN KEY ("parent_policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_translations" ADD CONSTRAINT "policy_translations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_translations" ADD CONSTRAINT "policy_translations_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
