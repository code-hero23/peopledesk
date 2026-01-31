const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndClear() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    console.log("Checking logs between", startOfDay, "and", endOfDay);

    const logs = await prisma.workLog.findMany({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        include: { user: true }
    });

    console.log(`Found ${logs.length} logs for today.`);

    if (logs.length > 0) {
        for (const log of logs) {
            console.log(`Deleting log ID: ${log.id} for user: ${log.user.email} (${log.user.designation}) - Status: ${log.logStatus}`);
            await prisma.workLog.delete({
                where: { id: log.id }
            });
        }
        console.log("Logs deleted. You can now test 'Start Day' again.");
    } else {
        console.log("No logs found. The 400 error might be something else?");
    }
}

checkAndClear()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
