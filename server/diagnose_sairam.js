const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const nameStr = process.argv[2] || 'Sairam G';
    try {
        console.log(`--- DIAGNOSTIC RUN FOR: ${nameStr} ---`);
        const user = await prisma.user.findFirst({
            where: { name: { contains: nameStr.split(' ')[0], mode: 'insensitive' } }
        });

        if (!user) {
            console.error("USER NOT FOUND.");
            return;
        }

        console.log(`USER: ${user.id} | ${user.name} | ${user.designation}`);

        const logs = await prisma.workLog.findMany({
            where: { userId: user.id },
            take: 3,
            orderBy: { date: 'desc' }
        });

        logs.forEach((log, i) => {
            console.log(`LOG [${i + 1}] DATE: ${log.date.toISOString()} | STATUS: ${log.logStatus}`);
            console.log(`PROCESS:`, JSON.stringify(log.process));
            console.log(`TASKS:  `, JSON.stringify(log.tasks));
            console.log(`CUSTOMFIELDS:`, JSON.stringify(log.customFields, null, 2));
            console.log(`---`);
        });

    } catch (err) {
        console.error("DIAGNOSTIC ERROR:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
