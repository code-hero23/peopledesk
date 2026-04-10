const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting safe database update...');
  

  
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
      'CUSTOM'
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
