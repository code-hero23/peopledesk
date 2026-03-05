const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateTestData() {
    try {
        const creUsers = await prisma.user.findMany({
            where: { designation: 'CRE' }
        });

        if (creUsers.length === 0) {
            console.log('No CRE users found to generate data for.');
            return;
        }

        const today = new Date();
        today.setHours(12, 0, 0, 0);

        for (const user of creUsers) {
            // Delete existing log for today to avoid unique constraint if re-running
            await prisma.workLog.deleteMany({
                where: {
                    userId: user.id,
                    date: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            });

            const testCalls = [
                { number: '9876543210', name: 'John Doe', type: 'INCOMING', duration: 120, date: new Date().getTime() },
                { number: '9123456789', name: 'Jane Smith', type: 'OUTGOING', duration: 45, date: new Date().getTime() - 3600000 },
                { number: '9988776655', name: null, type: 'MISSED', duration: 0, date: new Date().getTime() - 7200000 }
            ];

            const workLog = await prisma.workLog.create({
                data: {
                    userId: user.id,
                    date: today,
                    tasks: 'Generated test data for call analytics',
                    hours: 8,
                    logStatus: 'OPEN',
                    cre_synced_calls: testCalls,
                    cre_totalCalls: 3
                }
            });
            console.log(`Generated test data for user: ${user.name} (Log ID: ${workLog.id})`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateTestData();
