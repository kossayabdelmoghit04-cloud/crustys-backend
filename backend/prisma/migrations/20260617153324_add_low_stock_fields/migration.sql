-- AlterTable
ALTER TABLE "products" ADD COLUMN     "last_low_stock_alert_at" TIMESTAMP(3),
ADD COLUMN     "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "stock_alert_enabled" BOOLEAN NOT NULL DEFAULT true;
