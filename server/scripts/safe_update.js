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
    console.log('Columns "faId" and "creId" added to WalkinEntry or already exist.');
  } catch (err) {
    console.error('Error adding assignment columns to WalkinEntry:', err.message);
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
