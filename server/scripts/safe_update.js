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
