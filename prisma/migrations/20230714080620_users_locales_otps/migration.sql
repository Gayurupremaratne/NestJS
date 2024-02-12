-- CreateTable
CREATE TABLE "locales" (
    "code" VARCHAR(2) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL
);

-- CreateTable
CREATE TABLE "email_otps" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "code" VARCHAR(4) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nationality_code" VARCHAR(2) NOT NULL,
    "country_code" VARCHAR(10) NOT NULL,
    "contact_number" VARCHAR(15) NOT NULL,
    "passport_number" VARCHAR(9),
    "nic_number" VARCHAR(12),
    "date_of_birth" DATE,
    "email_otp_id" UUID,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_otp_sent_at" TIMESTAMPTZ,
    "password_reset_otp_id" UUID,
    "google_token" VARCHAR(255),
    "facebook_token" VARCHAR(255),
    "instagram_token" VARCHAR(255),
    "apple_token" VARCHAR(255),
    "profile_picture_key" VARCHAR(255),
    "preferred_locale_id" VARCHAR(2) NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locales_code_key" ON "locales"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_email_otp_id_fkey" FOREIGN KEY ("email_otp_id") REFERENCES "email_otps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_password_reset_otp_id_fkey" FOREIGN KEY ("password_reset_otp_id") REFERENCES "email_otps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_locale_id_fkey" FOREIGN KEY ("preferred_locale_id") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
