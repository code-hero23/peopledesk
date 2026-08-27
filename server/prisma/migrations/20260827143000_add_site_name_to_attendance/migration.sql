-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "siteName" TEXT,
ADD COLUMN IF NOT EXISTS "checkoutSiteName" TEXT;
