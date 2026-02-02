-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "deviceInfo" TEXT,
ADD COLUMN     "ipAddress" TEXT;

-- AlterTable
ALTER TABLE "WorkLog" ADD COLUMN     "ae_closing_metrics" JSONB,
ADD COLUMN     "ae_opening_metrics" JSONB;
