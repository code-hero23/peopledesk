/*
  Warnings:

  - The values [MANAGER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeaveType" ADD VALUE 'HALF_DAY';
ALTER TYPE "LeaveType" ADD VALUE 'FULL_DAY';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('EMPLOYEE', 'HR', 'BUSINESS_HEAD', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
COMMIT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkInPhoto" TEXT,
ADD COLUMN     "checkoutPhoto" TEXT,
ADD COLUMN     "checkoutTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "bhId" INTEGER,
ADD COLUMN     "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "hrId" INTEGER,
ADD COLUMN     "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "targetBhId" INTEGER;

-- AlterTable
ALTER TABLE "PermissionRequest" ADD COLUMN     "bhId" INTEGER,
ADD COLUMN     "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "hrId" INTEGER,
ADD COLUMN     "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "targetBhId" INTEGER;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "addOns" TEXT,
ADD COLUMN     "colours" JSONB,
ADD COLUMN     "cpCode" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fa" TEXT,
ADD COLUMN     "freezingAmount" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "mailId" TEXT,
ADD COLUMN     "measurements" JSONB,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "onlineMeeting" JSONB,
ADD COLUMN     "projectValue" TEXT,
ADD COLUMN     "referalBonus" TEXT,
ADD COLUMN     "requirements" JSONB,
ADD COLUMN     "showroomMeeting" JSONB,
ADD COLUMN     "siteStatus" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "specialNote" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "variant" TEXT,
ADD COLUMN     "woodwork" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "designation" TEXT NOT NULL DEFAULT 'LA';

-- AlterTable
ALTER TABLE "WorkLog" ADD COLUMN     "ae_clientFeedback" TEXT,
ADD COLUMN     "ae_clientMet" BOOLEAN DEFAULT false,
ADD COLUMN     "ae_gpsCoordinates" TEXT,
ADD COLUMN     "ae_hasIssues" BOOLEAN DEFAULT false,
ADD COLUMN     "ae_issueDescription" TEXT,
ADD COLUMN     "ae_issueType" TEXT,
ADD COLUMN     "ae_issuesRaised" TEXT,
ADD COLUMN     "ae_issuesResolved" TEXT,
ADD COLUMN     "ae_itemsInstalled" TEXT,
ADD COLUMN     "ae_measurements" TEXT,
ADD COLUMN     "ae_nextVisitDate" TIMESTAMP(3),
ADD COLUMN     "ae_nextVisitRequired" BOOLEAN DEFAULT false,
ADD COLUMN     "ae_photos" JSONB,
ADD COLUMN     "ae_plannedWork" TEXT,
ADD COLUMN     "ae_siteLocation" TEXT,
ADD COLUMN     "ae_siteStatus" TEXT,
ADD COLUMN     "ae_tasksCompleted" JSONB,
ADD COLUMN     "ae_visitType" JSONB,
ADD COLUMN     "ae_workStage" TEXT,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "completedImages" INTEGER,
ADD COLUMN     "cre_callBreakdown" TEXT,
ADD COLUMN     "cre_fqSent" INTEGER,
ADD COLUMN     "cre_orders" INTEGER,
ADD COLUMN     "cre_proposals" INTEGER,
ADD COLUMN     "cre_showroomVisits" INTEGER,
ADD COLUMN     "cre_totalCalls" INTEGER,
ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "fa_bookingFreezed" INTEGER,
ADD COLUMN     "fa_bookingFreezedClients" TEXT,
ADD COLUMN     "fa_calls" INTEGER,
ADD COLUMN     "fa_designPending" INTEGER,
ADD COLUMN     "fa_designPendingClients" TEXT,
ADD COLUMN     "fa_initialQuoteRn" INTEGER,
ADD COLUMN     "fa_loadingDiscussion" INTEGER,
ADD COLUMN     "fa_onlineDiscussion" INTEGER,
ADD COLUMN     "fa_onlineDiscussionClients" TEXT,
ADD COLUMN     "fa_onlineTime" TEXT,
ADD COLUMN     "fa_quotePending" INTEGER,
ADD COLUMN     "fa_quotePendingClients" TEXT,
ADD COLUMN     "fa_revisedQuoteRn" INTEGER,
ADD COLUMN     "fa_showroomTime" TEXT,
ADD COLUMN     "fa_showroomVisitClients" TEXT,
ADD COLUMN     "fa_showroomVisits" INTEGER,
ADD COLUMN     "fa_siteTime" TEXT,
ADD COLUMN     "fa_siteVisits" INTEGER,
ADD COLUMN     "imageCount" INTEGER,
ADD COLUMN     "la_addOns" TEXT,
ADD COLUMN     "la_colours" JSONB,
ADD COLUMN     "la_cpCode" TEXT,
ADD COLUMN     "la_fa" TEXT,
ADD COLUMN     "la_freezingAmount" TEXT,
ADD COLUMN     "la_mailId" TEXT,
ADD COLUMN     "la_measurements" JSONB,
ADD COLUMN     "la_number" TEXT,
ADD COLUMN     "la_onlineMeeting" JSONB,
ADD COLUMN     "la_projectLocation" TEXT,
ADD COLUMN     "la_projectValue" TEXT,
ADD COLUMN     "la_referalBonus" TEXT,
ADD COLUMN     "la_requirements" JSONB,
ADD COLUMN     "la_showroomMeeting" JSONB,
ADD COLUMN     "la_siteStatus" TEXT,
ADD COLUMN     "la_source" TEXT,
ADD COLUMN     "la_specialNote" TEXT,
ADD COLUMN     "la_variant" TEXT,
ADD COLUMN     "la_woodwork" TEXT,
ADD COLUMN     "pendingImages" INTEGER,
ADD COLUMN     "process" TEXT,
ADD COLUMN     "site" TEXT,
ADD COLUMN     "startTime" TEXT,
ALTER COLUMN "tasks" DROP NOT NULL,
ALTER COLUMN "hours" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CEOQuote" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CEOQuote_pkey" PRIMARY KEY ("id")
);
