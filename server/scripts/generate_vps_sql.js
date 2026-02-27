
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Helper to find missing columns/tables
// We'll generate a SQL file that adds everything with IF NOT EXISTS logic
// Note: Postgres ADD COLUMN IF NOT EXISTS requires careful handling for constraints.

let sql = `-- Catch-up Migration for VPS (Syncing DRIFTED columns)
-- Generated on: ${new Date().toISOString()}

`;

// 1. Enums
sql += `-- 1. Missing Enums
DO $$ BEGIN
    CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'RULE', 'NEWS', 'EVENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PopupType" AS ENUM ('INSPIRATIONAL', 'BIRTHDAY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "LogStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "BreakType" AS ENUM ('TEA', 'LUNCH', 'CLIENT_MEETING', 'BH_MEETING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

`;

// 2. Tables (AuditLog, Announcement, PopupConfig)
sql += `-- 2. Missing Tables
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" SERIAL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "userId" INTEGER,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PopupConfig" (
    "id" SERIAL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "PopupType" NOT NULL DEFAULT 'INSPIRATIONAL'
);

CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
    "priority" "Priority" NOT NULL DEFAULT 'LOW',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

`;

// 3. User Table Columns
sql += `-- 3. User Table Missing Columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reportingBhId" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isGlobalAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allocatedSalary" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "salaryViewEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "salaryDeductions" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "salaryDeductionBreakdown" JSONB DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timeShortageDeductionEnabled" BOOLEAN DEFAULT true;

-- Foreign Key for User reportingBhId
DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_reportingBhId_fkey" FOREIGN KEY ("reportingBhId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

`;

// 4. Attendance Table Columns
sql += `-- 4. Attendance Table Missing Columns
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInPhoto" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkoutPhoto" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkoutTime" TIMESTAMP(3);
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "deviceInfo" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkoutDeviceInfo" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkoutIpAddress" TEXT;

`;

// 5. WorkLog Columns (Lots of them)
const workLogCols = [
    ['ae_clientFeedback', 'TEXT'], ['ae_clientMet', 'BOOLEAN DEFAULT false'], ['ae_gpsCoordinates', 'TEXT'],
    ['ae_hasIssues', 'BOOLEAN DEFAULT false'], ['ae_issueDescription', 'TEXT'], ['ae_issueType', 'TEXT'],
    ['ae_issuesRaised', 'TEXT'], ['ae_issuesResolved', 'TEXT'], ['ae_itemsInstalled', 'TEXT'],
    ['ae_measurements', 'TEXT'], ['ae_nextVisitDate', 'TIMESTAMP(3)'], ['ae_nextVisitRequired', 'BOOLEAN DEFAULT false'],
    ['ae_photos', 'JSONB'], ['ae_plannedWork', 'TEXT'], ['ae_siteLocation', 'TEXT'],
    ['ae_siteStatus', 'TEXT'], ['ae_tasksCompleted', 'JSONB'], ['ae_visitType', 'JSONB'],
    ['ae_workStage', 'TEXT'], ['clientName', 'TEXT'], ['completedImages', 'INTEGER'],
    ['cre_callBreakdown', 'TEXT'], ['cre_fqSent', 'INTEGER'], ['cre_orders', 'INTEGER'],
    ['cre_proposals', 'INTEGER'], ['cre_showroomVisits', 'INTEGER'], ['cre_totalCalls', 'INTEGER'],
    ['customFields', 'JSONB'], ['endTime', 'TEXT'], ['fa_bookingFreezed', 'INTEGER'],
    ['fa_bookingFreezedClients', 'TEXT'], ['fa_calls', 'INTEGER'], ['fa_designPending', 'INTEGER'],
    ['fa_designPendingClients', 'TEXT'], ['fa_initialQuoteRn', 'INTEGER'], ['fa_loadingDiscussion', 'INTEGER'],
    ['fa_onlineDiscussion', 'INTEGER'], ['fa_onlineDiscussionClients', 'TEXT'], ['fa_onlineTime', 'TEXT'],
    ['fa_quotePending', 'INTEGER'], ['fa_quotePendingClients', 'TEXT'], ['fa_revisedQuoteRn', 'INTEGER'],
    ['fa_showroomTime', 'TEXT'], ['fa_showroomVisitClients', 'TEXT'], ['fa_showroomVisits', 'INTEGER'],
    ['fa_siteTime', 'TEXT'], ['fa_siteVisits', 'INTEGER'], ['imageCount', 'INTEGER'],
    ['la_addOns', 'TEXT'], ['la_colours', 'JSONB'], ['la_cpCode', 'TEXT'],
    ['la_fa', 'TEXT'], ['la_freezingAmount', 'TEXT'], ['la_mailId', 'TEXT'],
    ['la_measurements', 'JSONB'], ['la_number', 'TEXT'], ['la_onlineMeeting', 'JSONB'],
    ['la_projectLocation', 'TEXT'], ['la_projectValue', 'TEXT'], ['la_referalBonus', 'TEXT'],
    ['la_requirements', 'JSONB'], ['la_showroomMeeting', 'JSONB'], ['la_siteStatus', 'TEXT'],
    ['la_source', 'TEXT'], ['la_specialNote', 'TEXT'], ['la_variant', 'TEXT'],
    ['la_woodwork', 'TEXT'], ['pendingImages', 'INTEGER'], ['process', 'TEXT'],
    ['site', 'TEXT'], ['startTime', 'TEXT'], ['cre_closing_metrics', 'JSONB'],
    ['cre_opening_metrics', 'JSONB'], ['logStatus', '"LogStatus" NOT NULL DEFAULT \'CLOSED\''],
    ['fa_closing_metrics', 'JSONB'], ['fa_opening_metrics', 'JSONB'], ['la_closing_metrics', 'JSONB'],
    ['la_opening_metrics', 'JSONB'], ['la_project_reports', 'JSONB'], ['fa_project_reports', 'JSONB'],
    ['ae_project_reports', 'JSONB'], ['ae_closing_metrics', 'JSONB'], ['ae_opening_metrics', 'JSONB'],
    ['notes', 'TEXT']
];

sql += `-- 5. WorkLog Table Missing Columns
`;
workLogCols.forEach(([col, type]) => {
    sql += `ALTER TABLE "WorkLog" ADD COLUMN IF NOT EXISTS "${col}" ${type};
`;
});

// 6. Project Columns
const projCols = [
    ['description', 'TEXT'], ['managerId', 'INTEGER'], ['addOns', 'TEXT'], ['colours', 'JSONB'],
    ['cpCode', 'TEXT'], ['fa', 'TEXT'], ['freezingAmount', 'TEXT'], ['latitude', 'DOUBLE PRECISION'],
    ['location', 'TEXT'], ['longitude', 'DOUBLE PRECISION'], ['mailId', 'TEXT'], ['measurements', 'JSONB'],
    ['number', 'TEXT'], ['onlineMeeting', 'JSONB'], ['projectValue', 'TEXT'], ['referalBonus', 'TEXT'],
    ['requirements', 'JSONB'], ['showroomMeeting', 'JSONB'], ['siteStatus', 'TEXT'], ['source', 'TEXT'],
    ['specialNote', 'TEXT'], ['updatedAt', 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'], ['variant', 'TEXT'],
    ['woodwork', 'TEXT'], ['clientName', 'TEXT'], ['googleMapLink', 'TEXT']
];

sql += `
-- 6. Project Table Missing Columns
`;
projCols.forEach(([col, type]) => {
    sql += `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "${col}" ${type};
`;
});


// 7. Request Tables (Leave, Permission) Columns
sql += `
-- 7. Request Tables (Leave, Permission) Missing Columns
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "bhId" INTEGER;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "hrId" INTEGER;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "targetBhId" INTEGER;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "isExceededLimit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PermissionRequest" ADD COLUMN IF NOT EXISTS "bhId" INTEGER;
ALTER TABLE "PermissionRequest" ADD COLUMN IF NOT EXISTS "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "PermissionRequest" ADD COLUMN IF NOT EXISTS "hrId" INTEGER;
ALTER TABLE "PermissionRequest" ADD COLUMN IF NOT EXISTS "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "PermissionRequest" ADD COLUMN IF NOT EXISTS "targetBhId" INTEGER;
ALTER TABLE "PermissionRequest" ADD COLUMN IF NOT EXISTS "isExceededLimit" BOOLEAN NOT NULL DEFAULT false;

`;

// 8. New Feature Visit Requests
sql += `
-- 8. Visit Request Tables (SiteVisit, ShowroomVisit) - ensuring they exist fully
CREATE TABLE IF NOT EXISTS "SiteVisitRequest" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ShowroomVisitRequest" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GlobalSetting" (
    "id" SERIAL PRIMARY KEY,
    "key" TEXT UNIQUE NOT NULL,
    "value" TEXT NOT NULL
);


`;

fs.writeFileSync(path.join(__dirname, '../prisma/migrations/vps_sync_migration.sql'), sql);
console.log("Migration SQL generated successfully at prisma/migrations/vps_sync_migration.sql");
