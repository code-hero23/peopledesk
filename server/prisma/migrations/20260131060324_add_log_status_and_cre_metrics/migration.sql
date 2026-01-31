-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "WorkLog" ADD COLUMN     "cre_closing_metrics" JSONB,
ADD COLUMN     "cre_opening_metrics" JSONB,
ADD COLUMN     "logStatus" "LogStatus" NOT NULL DEFAULT 'CLOSED';
