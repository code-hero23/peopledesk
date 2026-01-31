
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestLogs() {
    console.log("Script started...");
    try {
        const roles = ['CRE', 'FA', 'LA', 'AE'];

        for (const role of roles) {
            console.log(`\n--- Latest Log for ${role} ---`);
            // Find a user with this role first
            const user = await prisma.user.findFirst({
                where: { designation: role }
            });

            if (!user) {
                console.log(`No user found with designation ${role}`);
                continue;
            }

            const log = await prisma.workLog.findFirst({
                where: { userId: user.id },
                orderBy: { date: 'desc' },
                include: { user: true }
            });

            if (log) {
                console.log(`Found Log ID: ${log.id}`);
                console.log(`Date: ${log.date}`);
                console.log(`User: ${log.user.name}`);

                // Explicitly check for metrics
                if (log.cre_opening_metrics) console.log("CRE Opening:", JSON.stringify(log.cre_opening_metrics, null, 2));
                if (log.cre_closing_metrics) console.log("CRE Closing:", JSON.stringify(log.cre_closing_metrics, null, 2));

                if (log.fa_opening_metrics) console.log("FA Opening:", JSON.stringify(log.fa_opening_metrics, null, 2));
                if (log.fa_closing_metrics) console.log("FA Closing:", JSON.stringify(log.fa_closing_metrics, null, 2));

                if (log.la_opening_metrics) console.log("LA Opening:", JSON.stringify(log.la_opening_metrics, null, 2));
                if (log.la_closing_metrics) console.log("LA Closing:", JSON.stringify(log.la_closing_metrics, null, 2));
                if (log.la_project_reports) console.log("LA Reports:", JSON.stringify(log.la_project_reports, null, 2));

                if (log.ae_opening_metrics) console.log("AE Opening:", JSON.stringify(log.ae_opening_metrics, null, 2));
                if (log.ae_closing_metrics) console.log("AE Closing:", JSON.stringify(log.ae_closing_metrics, null, 2));

            } else {
                console.log(`No worklog found for ${role}`);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
        console.log("Script finished.");
    }
}

checkLatestLogs();
