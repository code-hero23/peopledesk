const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const count = await prisma.workLog.count();
        console.log('Total WorkLogs:', count);

        const withCalls = await prisma.workLog.findMany({
            where: {
                cre_synced_calls: { not: null }
            },
            include: {
                user: true
            }
        });

        console.log('WorkLogs with synced calls:', withCalls.length);
        if (withCalls.length > 0) {
            withCalls.forEach(log => {
                console.log(`Log ID: ${log.id}, User: ${log.user.name}, Date: ${log.date}, Calls Count: ${Array.isArray(log.cre_synced_calls) ? log.cre_synced_calls.length : 'Not an array'}`);
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayLogs = await prisma.workLog.findMany({
            where: {
                date: { gte: today, lt: tomorrow }
            }
        });
        console.log('WorkLogs for today:', todayLogs.length);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
