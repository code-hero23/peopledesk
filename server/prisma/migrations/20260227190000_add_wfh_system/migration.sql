-- CreateTable
CREATE TABLE IF NOT EXISTS "WfhRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "reportingManager" TEXT NOT NULL,
    "wfhDays" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "realReason" TEXT NOT NULL,
    "necessityReason" TEXT NOT NULL,
    "impactIfRejected" TEXT NOT NULL,
    "proofDetails" TEXT NOT NULL,
    "primaryProject" TEXT NOT NULL,
    "criticalReason" TEXT NOT NULL,
    "deliverables" TEXT NOT NULL,
    "measurableOutput" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "workingHours" TEXT NOT NULL,
    "trackingMethod" TEXT NOT NULL,
    "communicationPlan" TEXT NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "environmentSetup" TEXT NOT NULL,
    "hasDedicatedWorkspace" BOOLEAN NOT NULL,
    "hasStableInternet" BOOLEAN NOT NULL,
    "noInterruptions" BOOLEAN NOT NULL,
    "hasPowerBackup" BOOLEAN NOT NULL,
    "hasSecurityCompliance" BOOLEAN NOT NULL,
    "hasErgonomicSeating" BOOLEAN NOT NULL,
    "risksManagement" TEXT NOT NULL,
    "failurePlan" TEXT NOT NULL,
    "officeVisitCommitment" BOOLEAN NOT NULL,
    "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WfhRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "wfhViewEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "WfhRequest" ADD CONSTRAINT "WfhRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
