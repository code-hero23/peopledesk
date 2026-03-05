const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDates() {
    const startDate = "2026-03-03";
    const endDate = "2026-03-05";

    let start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    let end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log("Start Query Date (Local/UTC?):", start);
    console.log("End Query Date (Local/UTC?):", end);

    const callLogs = await prisma.callLog.findMany({
        where: {
            date: { gte: start, lte: end }
        },
        include: {
            user: {
                select: { name: true, id: true }
            }
        }
    });

    console.log(`Found ${callLogs.length} logs in date range.`);
    if (callLogs.length > 0) {
        console.log("Sample log date from DB:", callLogs[0].date);
    }

    const allLogs = await prisma.callLog.findMany({ orderBy: { date: 'desc' }, take: 1 });
    console.log("Most recent log date in entire DB:", allLogs.length > 0 ? allLogs[0].date : "None");
}

testDates().finally(() => prisma.$disconnect());
