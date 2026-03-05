-- AlterTable
ALTER TABLE "WorkLog" ADD COLUMN IF NOT EXISTS "cre_synced_calls" JSONB;

-- AlterTable
ALTER TABLE "WfhRequest" ADD COLUMN IF NOT EXISTS "reportingManagerId" INTEGER;
