-- CreateTable
CREATE TABLE "AssetKeys" (
    "id" UUID NOT NULL,
    "fileKey" VARCHAR(255) NOT NULL,
    "module" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetKeys_pkey" PRIMARY KEY ("id")
);
