/*
  Warnings:

  - You are about to drop the column `created_at` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `customer_name` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `guests_count` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `reservation_date` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `reservation_time` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `special_request` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `reservations` table. All the data in the column will be lost.
  - Added the required column `customerName` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerPhone` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestsCount` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reservationDate` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reservationTime` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `reservations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "created_at",
DROP COLUMN "customer_name",
DROP COLUMN "email",
DROP COLUMN "guests_count",
DROP COLUMN "phone",
DROP COLUMN "reservation_date",
DROP COLUMN "reservation_time",
DROP COLUMN "special_request",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "customerPhone" TEXT NOT NULL,
ADD COLUMN     "guestsCount" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reservationDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "reservationTime" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "reservations_reservationDate_idx" ON "reservations"("reservationDate");
