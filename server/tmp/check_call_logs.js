const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCallLogs() {
    try {
        console.log('--- Checking Call Logs ---');
        const logs = await prisma.callLog.findMany({
            orderBy: { date: 'desc' },
            take: 5,
            include: { user: { select: { id: true, name: true, role: true } } }
        });

        if (logs.length === 0) {
            console.log('No call logs found in DB.');
        } else {
            logs.forEach(log => {
                console.log(`User: ${log.user.name} (${log.user.id}) | Role: ${log.user.role}`);
                console.log(`Date: ${log.date.toISOString()}`);
                console.log(`Total Calls: ${log.totalCalls}`);
                if (log.calls && log.calls.length > 0) {
                    console.log(`First Call Date: ${new Date(log.calls[0].date).toISOString()}`);
                    console.log(`First Call Number: ${log.calls[0].number}`);
                    console.log(`SIM ID in log: ${log.calls[0].simId || log.calls[0].simSlot || 'N/A'}`);
                }
                console.log('---------------------------');
            });
        }
    } catch (error) {
        console.error('Error checking call logs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCallLogs();
