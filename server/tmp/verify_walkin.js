const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking WalkinEntry table...");
        const count = await prisma.walkinEntry.count();
        console.log(`Current WalkinEntry count: ${count}`);
        
        console.log("Checking for Business Heads...");
        const bhs = await prisma.user.findMany({
            where: { role: 'BUSINESS_HEAD' },
            select: { id: true, name: true }
        });
        console.log("Business Heads found:", bhs);
        
        console.log("Verification complete.");
    } catch (error) {
        console.error("Verification failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
