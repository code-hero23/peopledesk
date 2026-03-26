const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting safe database update...');
  
  // Adding inTime
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "WalkinEntry" ADD COLUMN IF NOT EXISTS "inTime" TEXT`);
    console.log('Column "inTime" added or already exists.');
  } catch (err) {
    console.error('Error adding "inTime":', err.message);
  }

  // Adding outTime
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "WalkinEntry" ADD COLUMN IF NOT EXISTS "outTime" TEXT`);
    console.log('Column "outTime" added or already exists.');
  } catch (err) {
    console.error('Error adding "outTime":', err.message);
  }
  
  // Adding User columns
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "walkinViewEnabled" BOOLEAN DEFAULT false`);
    console.log('Column "walkinViewEnabled" added or already exists.');
  } catch (err) {
    console.error('Error adding "walkinViewEnabled":', err.message);
  }

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

  // Adding WalkinEntry assignment columns
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "WalkinEntry" ADD COLUMN IF NOT EXISTS "faId" INTEGER`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "WalkinEntry" ADD COLUMN IF NOT EXISTS "creId" INTEGER`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "WalkinEntry" ADD COLUMN IF NOT EXISTS "reviewSent" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "WalkinEntry" ADD COLUMN IF NOT EXISTS "outTimeRecordedAt" TIMESTAMP(3)`);

    await prisma.$executeRawUnsafe(`ALTER TABLE "WfhRequest" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`);

    console.log('Columns "faId", "creId", "reviewSent", "outTimeRecordedAt" added to WalkinEntry, and "createdAt" added to WfhRequest or already exist.');
  } catch (err) {
    console.error('Error adding assignment and review columns to WalkinEntry:', err.message);
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
