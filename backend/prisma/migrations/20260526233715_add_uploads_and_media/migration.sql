/*
  Warnings:

  - Added the required column `first_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "password_reset_expires" TIMESTAMP(3),
ADD COLUMN     "password_reset_token" TEXT,
ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
ALTER COLUMN "full_name" SET DEFAULT '';

-- CreateTable
CREATE TABLE "media_metadata" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "urls" JSONB NOT NULL,
    "variants" JSONB NOT NULL,
    "upload_duration" INTEGER NOT NULL,
    "total_duration" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_versions" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "original_url" TEXT NOT NULL,
    "active_url" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_uploads" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "error_reason" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "stack_trace" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_processing_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "failed_uploads_job_id_key" ON "failed_uploads"("job_id");
