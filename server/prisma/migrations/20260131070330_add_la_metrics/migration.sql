-- AlterTable
ALTER TABLE "WorkLog" ADD COLUMN     "la_closing_metrics" JSONB,
ADD COLUMN     "la_opening_metrics" JSONB,
ADD COLUMN     "la_project_reports" JSONB;
