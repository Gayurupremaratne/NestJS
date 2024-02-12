-- CreateTable
CREATE TABLE "user_delete_request" (
    "user_id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_delete_request_pkey" PRIMARY KEY ("user_id","token")
);
