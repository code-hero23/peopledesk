const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoleStatus() {
    console.log("Checking latest worklog dates for each role...\n");

    const roles = ['CRE', 'FA', 'LA', 'AE', 'HR', 'BUSINESS_HEAD', 'EMPLOYEE'];

    for (const role of roles) {
        // Find users with this role
        const users = await prisma.user.findMany({
            where: { designation: role },
            select: { id: true, name: true }
        });

        if (users.length === 0) {
            console.log(`[${role}] No users found with this designation.`);
            continue;
        }

        const userIds = users.map(u => u.id);

        // Find latest log for these users
        const latestLog = await prisma.workLog.findFirst({
            where: { userId: { in: userIds } },
            orderBy: { date: 'desc' },
            include: { user: true }
        });

        if (latestLog) {
            console.log(`[${role}] Latest Log: ${new Date(latestLog.date).toLocaleDateString()} by ${latestLog.user.name}`);
        } else {
            console.log(`[${role}] No worklogs found ever.`);
        }
    }

    console.log("\nDone.");
    await prisma.$disconnect();
}

checkRoleStatus();
