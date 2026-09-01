const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting safe database update...');
  

  
  // Ensure Role enum contains WALL2WALL_EMPLOYEE & FRONT_DESK_MANAGER
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WALL2WALL_EMPLOYEE'`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FRONT_DESK_MANAGER'`);
    console.log('Role enum updated with "WALL2WALL_EMPLOYEE" and "FRONT_DESK_MANAGER" if not exists.');
  } catch (err) {
    console.warn('Note on Role enum update:', err.message);
  }

  // Adding User columns
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "callAnalyticsViewEnabled" BOOLEAN DEFAULT false`);
    console.log('Column "callAnalyticsViewEnabled" added or already exists.');
  } catch (err) {
    console.error('Error adding "callAnalyticsViewEnabled":', err.message);
  }

  // Adding Notification Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
          "id" SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'INFO',
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "relatedId" INTEGER,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    console.log('Table "Notification" created or already exists.');
  } catch (err) {
    console.error('Error creating "Notification" table:', err.message);
  }

  // Adding WfhRequest remarks
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "WfhRequest" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "WfhRequest" ADD COLUMN IF NOT EXISTS "hrRemarks" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "WfhRequest" ADD COLUMN IF NOT EXISTS "bhRemarks" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "WfhRequest" ADD COLUMN IF NOT EXISTS "adminRemarks" TEXT`);
    console.log('Columns "createdAt", "hrRemarks", "bhRemarks", "adminRemarks" added to WfhRequest or already exist.');
  } catch (err) {
    console.error('Error adding columns to WfhRequest:', err.message);
  }

  // Adding Biometric columns and table
  try {
    console.log('Adding Biometric columns and table...');
    
    // Create BiometricLog table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BiometricLog" (
          "id" SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "punchTime" TIMESTAMP(3) NOT NULL,
          "punchType" TEXT,
          "deviceId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "BiometricLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    console.log('Table "BiometricLog" created or already exists.');

    // Add biometricId to User
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "biometricId" TEXT`);
    console.log('Column "biometricId" added to User or already exists.');

    // Create Indexes
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_biometricId_key" ON "User"("biometricId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BiometricLog_userId_punchTime_idx" ON "BiometricLog"("userId", "punchTime")`);
      console.log('Biometric indexes created or already exist.');
    } catch (idxErr) {
      console.warn('Note: Biometric index creation warning (may already exist):', idxErr.message);
    }

  } catch (err) {
    console.error('Error adding Biometric components:', err.message);
  }

  // Adding PerformanceScore Table
  try {
    console.log('Checking PerformanceScore table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PerformanceScore" (
          "id" SERIAL PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PerformanceScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // Ensure new column names exist (in case table was created with old names)
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PerformanceScore" ADD COLUMN IF NOT EXISTS "efficiency" DOUBLE PRECISION NOT NULL DEFAULT 0`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "PerformanceScore" ADD COLUMN IF NOT EXISTS "consistency" DOUBLE PRECISION NOT NULL DEFAULT 0`);
        console.log('Columns "efficiency" and "consistency" ensured.');
    } catch (colErr) {
        console.warn('Note: Column update warning:', colErr.message);
    }
    
    // Create Unique Index for userId_month_year
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceScore_userId_month_year_key" ON "PerformanceScore"("userId", "month", "year")`);
      console.log('PerformanceScore table and unique index created or already exist.');
    } catch (idxErr) {
      console.warn('Note: PerformanceScore index creation warning:', idxErr.message);
    }
  } catch (err) {
    console.error('Error adding PerformanceScore table:', err.message);
  }

  // Adding new VoucherType enum values
  try {
    console.log('Expanding "VoucherType" enum...');
    const newTypes = [
      'COMPANY_PAYS_FIRST',
      'COMPANY_PAY_AFTER',
      'CLIENT_REFUND',
      'VENDOR_PAYMENT',
      'BH_VOUCHER',
      'OFFICE_EXPENSES',
      'SALARY_ADVANCE',
      'CUSTOM',
      'LEO_SIR_BH',
      'SANGHATAMIZH_MAM_BH',
      'RAJKUMAR_SIR_BH',
      'PUGAZH_SIR_BH',
      'RAMYA_MAM_BH'
    ];

    for (const type of newTypes) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TYPE "VoucherType" ADD VALUE '${type}'`);
        console.log(`VoucherType "${type}" added.`);
      } catch (err) {
        // Error code 42710 is "duplicate_object" in Postgres for ADD VALUE
        if (err.message.includes('already exists') || err.message.includes('42710')) {
          console.log(`VoucherType "${type}" already exists.`);
        } else {
          console.error(`Error adding VoucherType "${type}":`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Error in VoucherType expansion:', err.message);
  }

  // Adding new VoucherStatus enum values
  try {
    console.log('Expanding "VoucherStatus" enum...');
    const statusType = 'PAID';
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "VoucherStatus" ADD VALUE '${statusType}'`);
      console.log(`VoucherStatus "${statusType}" added.`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('42710')) {
        console.log(`VoucherStatus "${statusType}" already exists.`);
      } else {
        console.error(`Error adding VoucherStatus "${statusType}":`, err.message);
      }
    }
  } catch (err) {
    console.error('Error in VoucherStatus expansion:', err.message);
  }

  // Adding Helpdesk Schema
  try {
    console.log('Synchronizing Helpdesk Schema...');

    // 1. Create Enums
    const enums = [
      { name: 'TicketStatus', values: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
      { name: 'TicketType', values: ['ISSUE', 'SUGGESTION', 'PROBLEM'] },
      { name: 'HelpdeskCategory', values: ['SALARY', 'TECHNICAL', 'POLICY', 'WORKPLACE', 'GROWTH', 'OTHER'] }
    ];

    for (const enumInfo of enums) {
      try {
        await prisma.$executeRawUnsafe(`CREATE TYPE "${enumInfo.name}" AS ENUM (${enumInfo.values.map(v => `'${v}'`).join(', ')})`);
        console.log(`Enum "${enumInfo.name}" created.`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`Enum "${enumInfo.name}" already exists.`);
        } else {
          console.error(`Error creating enum ${enumInfo.name}:`, e.message);
        }
      }
    }

    // 2. Create Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HelpdeskTicket" (
          "id" SERIAL PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "HelpdeskTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    console.log('Table "HelpdeskTicket" created or already exists.');

  } catch (err) {
    console.error('Error in Helpdesk Schema sync:', err.message);
  }

  // Adding Seating Columns and SeatAssignment Table
  try {
    console.log('Syncing Seating schema...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "seatId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "siteName" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkoutSiteName" TEXT`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SeatAssignment" (
          "id" SERIAL PRIMARY KEY,
          "seatId" TEXT UNIQUE NOT NULL,
          "level" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
          "clientNote" TEXT,
          "userId" INTEGER,
          "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SeatAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SeatAssignment_seatId_key" ON "SeatAssignment"("seatId")`);
    console.log('Seating schema synced successfully.');
  } catch (err) {
    console.error('Error in Seating schema sync:', err.message);
  }

  // Adding VisitorRecord Table
  try {
    console.log('Syncing VisitorRecord schema...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VisitorRecord" (
          "id" SERIAL PRIMARY KEY,
          "clientName" TEXT NOT NULL,
          "phoneNumber" TEXT NOT NULL,
          "reasonOfVisit" TEXT NOT NULL,
          "showroom" TEXT NOT NULL,
          "dateOfVisit" TIMESTAMP(3) NOT NULL,
          "timeOfEntry" TEXT NOT NULL,
          "creId" INTEGER NOT NULL,
          "faId" INTEGER,
          "laId" INTEGER,
          "bhId" INTEGER,
          "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
          "whatsappLog" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "VisitorRecord_creId_fkey" FOREIGN KEY ("creId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "VisitorRecord_faId_fkey" FOREIGN KEY ("faId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "VisitorRecord_laId_fkey" FOREIGN KEY ("laId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "VisitorRecord_bhId_fkey" FOREIGN KEY ("bhId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    console.log('VisitorRecord table created or already exists.');
  } catch (err) {
    console.error('Error in VisitorRecord schema sync:', err.message);
  }

  // Adding AELocationLog Table
  try {
    console.log('Syncing AELocationLog schema...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AELocationLog" (
          "id" SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "latitude" DOUBLE PRECISION NOT NULL,
          "longitude" DOUBLE PRECISION NOT NULL,
          "accuracy" DOUBLE PRECISION,
          "batteryLevel" INTEGER,
          "speed" DOUBLE PRECISION,
          "address" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AELocationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AELocationLog_userId_createdAt_idx" ON "AELocationLog"("userId", "createdAt")`);
    console.log('AELocationLog table created or already exists.');
  } catch (err) {
    console.error('Error in AELocationLog schema sync:', err.message);
  }

  // Cleanup AE CallLogs and reset callAnalyticsViewEnabled for AEs
  try {
    console.log('Cleaning up legacy AE call logs and permissions...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "CallLog" 
      WHERE "userId" IN (
        SELECT id FROM "User" 
        WHERE role = 'AE' 
           OR designation ILIKE '%AE%' 
           OR designation ILIKE '%Architect%'
      );
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET "callAnalyticsViewEnabled" = false 
      WHERE role = 'AE' 
         OR designation ILIKE '%AE%' 
         OR designation ILIKE '%Architect%';
    `);
    console.log('Legacy AE call logs cleaned up successfully.');
  } catch (err) {
    console.error('Error cleaning up AE call logs:', err.message);
  }

  console.log('Safe update completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
