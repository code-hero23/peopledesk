const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findLatestDate() {
    try {
        const latestLog = await prisma.workLog.findFirst({
            orderBy: { date: 'desc' }
        });

        if (latestLog) {
            console.log(`Latest log date: ${latestLog.date.toISOString().split('T')[0]}`);
        } else {
            console.log("No logs found in database.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

findLatestDate();
