/*
  Warnings:

  - You are about to drop the column `admin_id` on the `activity_logs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_admin_id_fkey";

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "admin_id",
ADD COLUMN     "entity" TEXT,
ADD COLUMN     "entity_id" TEXT,
ADD COLUMN     "new_value" JSONB,
ADD COLUMN     "old_value" JSONB,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "user_email" TEXT,
ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs"("entity");
