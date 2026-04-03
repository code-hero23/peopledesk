const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { name: { contains: 'Aravindan', mode: 'insensitive' } }
        });

        if (!user) {
            console.log("User 'Aravindan S' not found in database.");
            return;
        }

        console.log(`Analyzing User ID: ${user.id}, Name: ${user.name}, Desig: ${user.designation}`);

        // Cycle: Feb 26 00:00 IST to Mar 25 23:59 IST
        // On UTC server, this is roughly Feb 25 18:30 UTC to Mar 25 18:30 UTC
        const startDate = new Date('2026-02-25T18:30:00.000Z');
        const endDate = new Date('2026-03-25T18:30:00.000Z');

        const logs = await prisma.workLog.findMany({
            where: {
                userId: user.id,
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: 'asc' }
        });

        console.log(`Found ${logs.length} logs for the March cycle.`);

        logs.forEach((log, i) => {
            console.log(`Log ${i + 1} for ${log.date.toISOString()}:`);
            console.log(`- logStatus: ${log.logStatus}`);
            console.log(`- process: ${JSON.stringify(log.process)}`);
            console.log(`- tasks: ${JSON.stringify(log.tasks)}`);
            console.log(`- remarks: ${JSON.stringify(log.remarks)}`);
            console.log(`- notes: ${JSON.stringify(log.notes)}`);
            console.log(`- customFields: ${JSON.stringify(log.customFields)}`);
            console.log('---');
        });

    } catch (err) {
        console.error("Error inspecting logs:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
