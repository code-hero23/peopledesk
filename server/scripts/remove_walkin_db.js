const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking for WalkinEntry table...");
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "WalkinEntry" CASCADE;`);
    console.log("Dropped WalkinEntry table.");

    console.log("Checking for walkinViewEnabled column in User table...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN IF EXISTS "walkinViewEnabled";`);
    console.log("Dropped walkinViewEnabled column.");

    console.log("Success! Walkin Hub data has been removed from the database.");
    console.log("Note: All other data (Employees, Attendance, WorkLogs, etc.) remains safe.");
  } catch (error) {
    console.error("Error during database cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
