/*
  Warnings:

  - You are about to drop the `Plan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Plan" DROP CONSTRAINT "Plan_profileId_fkey";

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "description" TEXT,
ADD COLUMN     "monthlyContribution" DOUBLE PRECISION,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'P1',
ADD COLUMN     "term" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Other';

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "linkedGoalId" INTEGER,
ADD COLUMN     "purpose" TEXT;

-- DropTable
DROP TABLE "Plan";

-- CreateIndex
CREATE INDEX "Investment_linkedGoalId_idx" ON "Investment"("linkedGoalId");

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_linkedGoalId_fkey" FOREIGN KEY ("linkedGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
