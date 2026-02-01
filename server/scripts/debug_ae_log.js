const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAELog() {
    const users = await prisma.user.findMany({
        where: { designation: 'AE' }
    });

    if (users.length === 0) {
        console.log("No AE users found");
        return;
    }

    console.log(`Found ${users.length} AE users.`);

    for (const user of users) {
        console.log(`Checking logs for ${user.name} (${user.email})...`);
        const logs = await prisma.workLog.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' },
            take: 3
        });

        if (logs.length > 0) {
            logs.forEach(log => {
                console.log(`  ID: ${log.id}, Date: ${log.date.toISOString()}`);
            });
        } else {
            console.log("  No logs found.");
        }
    }

    await prisma.$disconnect();
}

checkAELog();
