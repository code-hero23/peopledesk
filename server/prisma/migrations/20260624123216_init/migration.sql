-- CreateEnum
CREATE TYPE "PopupType" AS ENUM ('INSPIRATIONAL', 'BIRTHDAY');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'RULE', 'NEWS', 'EVENT');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'HR', 'BUSINESS_HEAD', 'ADMIN', 'AE_MANAGER', 'ACCOUNTS_MANAGER', 'ANALYZER');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('PREPAID', 'POSTPAID', 'ADVANCE', 'COMPANY_PAYS_FIRST', 'COMPANY_PAY_AFTER', 'CLIENT_REFUND', 'VENDOR_PAYMENT', 'BH_VOUCHER', 'OFFICE_EXPENSES', 'SALARY_ADVANCE', 'CUSTOM', 'LEO_SIR_BH', 'SANGHATAMIZH_MAM_BH', 'RAJKUMAR_SIR_BH', 'PUGAZH_SIR_BH', 'RAMYA_MAM_BH');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'WAITING', 'PAID');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('CASUAL', 'SICK', 'PAID', 'HALF_DAY', 'FULL_DAY');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('TEA', 'LUNCH', 'CLIENT_MEETING', 'BH_MEETING');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('ISSUE', 'SUGGESTION', 'PROBLEM');

-- CreateEnum
CREATE TYPE "HelpdeskCategory" AS ENUM ('SALARY', 'TECHNICAL', 'POLICY', 'WORKPLACE', 'GROWTH', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "lastWorkLogDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "designation" TEXT NOT NULL DEFAULT 'LA',
    "reportingBhId" INTEGER,
    "isGlobalAccess" BOOLEAN NOT NULL DEFAULT false,
    "allocatedSalary" DOUBLE PRECISION DEFAULT 0,
    "salaryViewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "salaryDeductions" DOUBLE PRECISION DEFAULT 0,
    "salaryDeductionBreakdown" JSONB DEFAULT '[]',
    "timeShortageDeductionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wfhViewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "callAnalyticsViewEnabled" BOOLEAN DEFAULT false,
    "biometricId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisitRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "targetBhId" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowroomVisitRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sourceShowroom" TEXT NOT NULL,
    "destinationShowroom" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "targetBhId" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowroomVisitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkInPhoto" TEXT,
    "checkoutPhoto" TEXT,
    "checkoutTime" TIMESTAMP(3),
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "checkoutDeviceInfo" TEXT,
    "checkoutIpAddress" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "punchTime" TIMESTAMP(3) NOT NULL,
    "punchType" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakLog" (
    "id" SERIAL NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "breakType" "BreakType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "isExceededAlertSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BreakLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" INTEGER,
    "projectName" TEXT,
    "tasks" TEXT,
    "hours" DOUBLE PRECISION,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ae_clientFeedback" TEXT,
    "ae_clientMet" BOOLEAN DEFAULT false,
    "ae_gpsCoordinates" TEXT,
    "ae_hasIssues" BOOLEAN DEFAULT false,
    "ae_issueDescription" TEXT,
    "ae_issueType" TEXT,
    "ae_issuesRaised" TEXT,
    "ae_issuesResolved" TEXT,
    "ae_itemsInstalled" TEXT,
    "ae_measurements" TEXT,
    "ae_nextVisitDate" TIMESTAMP(3),
    "ae_nextVisitRequired" BOOLEAN DEFAULT false,
    "ae_photos" JSONB,
    "ae_plannedWork" TEXT,
    "ae_siteLocation" TEXT,
    "ae_siteStatus" TEXT,
    "ae_tasksCompleted" JSONB,
    "ae_visitType" JSONB,
    "ae_workStage" TEXT,
    "clientName" TEXT,
    "completedImages" INTEGER,
    "cre_callBreakdown" TEXT,
    "cre_fqSent" INTEGER,
    "cre_orders" INTEGER,
    "cre_proposals" INTEGER,
    "cre_showroomVisits" INTEGER,
    "cre_totalCalls" INTEGER,
    "customFields" JSONB,
    "endTime" TEXT,
    "fa_bookingFreezed" INTEGER,
    "fa_bookingFreezedClients" TEXT,
    "fa_calls" INTEGER,
    "fa_designPending" INTEGER,
    "fa_designPendingClients" TEXT,
    "fa_initialQuoteRn" INTEGER,
    "fa_loadingDiscussion" INTEGER,
    "fa_onlineDiscussion" INTEGER,
    "fa_onlineDiscussionClients" TEXT,
    "fa_onlineTime" TEXT,
    "fa_quotePending" INTEGER,
    "fa_quotePendingClients" TEXT,
    "fa_revisedQuoteRn" INTEGER,
    "fa_showroomTime" TEXT,
    "fa_showroomVisitClients" TEXT,
    "fa_showroomVisits" INTEGER,
    "fa_siteTime" TEXT,
    "fa_siteVisits" INTEGER,
    "imageCount" INTEGER,
    "la_addOns" TEXT,
    "la_colours" JSONB,
    "la_cpCode" TEXT,
    "la_fa" TEXT,
    "la_freezingAmount" TEXT,
    "la_mailId" TEXT,
    "la_measurements" JSONB,
    "la_number" TEXT,
    "la_onlineMeeting" JSONB,
    "la_projectLocation" TEXT,
    "la_projectValue" TEXT,
    "la_referalBonus" TEXT,
    "la_requirements" JSONB,
    "la_showroomMeeting" JSONB,
    "la_siteStatus" TEXT,
    "la_source" TEXT,
    "la_specialNote" TEXT,
    "la_variant" TEXT,
    "la_woodwork" TEXT,
    "pendingImages" INTEGER,
    "process" TEXT,
    "site" TEXT,
    "startTime" TEXT,
    "cre_closing_metrics" JSONB,
    "cre_opening_metrics" JSONB,
    "logStatus" "LogStatus" NOT NULL DEFAULT 'CLOSED',
    "fa_closing_metrics" JSONB,
    "fa_opening_metrics" JSONB,
    "la_closing_metrics" JSONB,
    "la_opening_metrics" JSONB,
    "la_project_reports" JSONB,
    "ae_closing_metrics" JSONB,
    "ae_opening_metrics" JSONB,
    "fa_project_reports" JSONB,
    "ae_project_reports" JSONB,
    "notes" TEXT,
    "cre_synced_calls" JSONB,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calls" JSONB,
    "totalCalls" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bhId" INTEGER,
    "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "hrId" INTEGER,
    "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "targetBhId" INTEGER,
    "isExceededLimit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bhId" INTEGER,
    "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "hrId" INTEGER,
    "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "targetBhId" INTEGER,
    "isExceededLimit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PermissionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAccessRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "managerId" INTEGER,
    "addOns" TEXT,
    "colours" JSONB,
    "cpCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fa" TEXT,
    "freezingAmount" TEXT,
    "latitude" DOUBLE PRECISION,
    "location" TEXT,
    "longitude" DOUBLE PRECISION,
    "mailId" TEXT,
    "measurements" JSONB,
    "number" TEXT,
    "onlineMeeting" JSONB,
    "projectValue" TEXT,
    "referalBonus" TEXT,
    "requirements" JSONB,
    "showroomMeeting" JSONB,
    "siteStatus" TEXT,
    "source" TEXT,
    "specialNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variant" TEXT,
    "woodwork" TEXT,
    "clientName" TEXT,
    "googleMapLink" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "userId" INTEGER,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupConfig" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "PopupType" NOT NULL DEFAULT 'INSPIRATIONAL',

    CONSTRAINT "PopupConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
    "priority" "Priority" NOT NULL DEFAULT 'LOW',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualPayroll" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "allocatedSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absenteeismDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortageDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayout" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPayroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WfhRequest" (
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
    "hrRemarks" TEXT,
    "bhRemarks" TEXT,
    "adminRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportingManagerId" INTEGER,

    CONSTRAINT "WfhRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "VoucherType" NOT NULL DEFAULT 'POSTPAID',
    "amount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "VoucherStatus" NOT NULL DEFAULT 'PENDING',
    "amId" INTEGER,
    "amStatus" "VoucherStatus" NOT NULL DEFAULT 'PENDING',
    "amRemarks" TEXT,
    "amApprovedAt" TIMESTAMP(3),
    "cooId" INTEGER,
    "cooStatus" "VoucherStatus" NOT NULL DEFAULT 'PENDING',
    "cooRemarks" TEXT,
    "cooApprovedAt" TIMESTAMP(3),
    "proofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" INTEGER,
    "adminRemarks" TEXT,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finance" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "currentCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "carpenterImpactEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Finance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "addedById" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarpenterRecord" (
    "id" SERIAL NOT NULL,
    "aeName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "carpenterName" TEXT NOT NULL,
    "workOrderValue" DOUBLE PRECISION NOT NULL,
    "leoSirRate" DOUBLE PRECISION NOT NULL,
    "cookscapeRate" DOUBLE PRECISION NOT NULL,
    "advance" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarpenterRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceScore" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "efficiency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consistency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "system" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "behaviour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpdeskTicket" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TicketType" NOT NULL DEFAULT 'ISSUE',
    "category" "HelpdeskCategory" NOT NULL DEFAULT 'OTHER',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "hrRemarks" TEXT,
    "bhRemarks" TEXT,
    "cooRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpdeskTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_biometricId_key" ON "User"("biometricId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");

-- CreateIndex
CREATE INDEX "BiometricLog_userId_punchTime_idx" ON "BiometricLog"("userId", "punchTime");

-- CreateIndex
CREATE UNIQUE INDEX "CallLog_userId_date_key" ON "CallLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSetting_key_key" ON "GlobalSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ManualPayroll_email_month_year_key" ON "ManualPayroll"("email", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceScore_userId_month_year_key" ON "PerformanceScore"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_reportingBhId_fkey" FOREIGN KEY ("reportingBhId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisitRequest" ADD CONSTRAINT "SiteVisitRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowroomVisitRequest" ADD CONSTRAINT "ShowroomVisitRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricLog" ADD CONSTRAINT "BiometricLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakLog" ADD CONSTRAINT "BreakLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionRequest" ADD CONSTRAINT "PermissionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAccessRequest" ADD CONSTRAINT "LoginAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WfhRequest" ADD CONSTRAINT "WfhRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceScore" ADD CONSTRAINT "PerformanceScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
