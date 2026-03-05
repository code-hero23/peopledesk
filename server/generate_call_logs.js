const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateCallLogs() {
    try {
        const cres = await prisma.user.findMany({
            where: { designation: 'CRE' }
        });

        if (cres.length === 0) {
            console.log('No CRE users found.');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const user of cres) {
            await prisma.callLog.upsert({
                where: {
                    userId_date: {
                        userId: user.id,
                        date: today
                    }
                },
                update: {
                    calls: [
                        { number: '9876543210', name: 'John Doe', type: 'INCOMING', duration: 120, date: Date.now() },
                        { number: '1234567890', name: 'Jane Smith', type: 'OUTGOING', duration: 45, date: Date.now() - 3600000 }
                    ],
                    totalCalls: 2
                },
                create: {
                    userId: user.id,
                    date: today,
                    calls: [
                        { number: '9876543210', name: 'John Doe', type: 'INCOMING', duration: 120, date: Date.now() },
                        { number: '1234567890', name: 'Jane Smith', type: 'OUTGOING', duration: 45, date: Date.now() - 3600000 }
                    ],
                    totalCalls: 2
                }
            });
            console.log(`Generated CallLog for ${user.name}`);
        }
    } catch (error) {
        console.error('Error generating CallLog:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateCallLogs();
