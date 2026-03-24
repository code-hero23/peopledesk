const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogs(email) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log(`User not found: ${email}`);
            return;
        }

        console.log(`Check logs for ${user.name} (ID: ${user.id})`);
        
        const logs = await prisma.biometricLog.findMany({
            where: { userId: user.id },
            orderBy: { punchTime: 'asc' }
        });

        console.log(`Total Logs Found: ${logs.length}`);
        
        logs.forEach(log => {
            const istDate = new Date(log.punchTime.getTime() + (5.5 * 60 * 60 * 1000));
            console.log(`${istDate.toISOString()} | Raw: ${log.punchTime.toISOString()} | Type: ${log.punchType}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkLogs(process.argv[2]);
