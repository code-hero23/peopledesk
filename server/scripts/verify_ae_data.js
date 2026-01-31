const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const log = await prisma.workLog.findFirst({
            orderBy: { createdAt: 'desc' },
            where: {
                ae_opening_metrics: { not: null }
            }
        });

        if (!log) {
            console.log("No AE Worklog found with opening metrics.");
            // Try finding ANY log to see if schema has the field
            const anyLog = await prisma.workLog.findFirst();
            console.log("Keys on a standard log:", Object.keys(anyLog || {}));
        } else {
            console.log("Found Log ID:", log.id);
            console.log("AE Opening Metrics (Raw):", log.ae_opening_metrics);
            console.log("Type of Metrics:", typeof log.ae_opening_metrics);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
