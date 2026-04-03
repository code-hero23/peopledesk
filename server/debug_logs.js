const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { name: 'Aravindan S' }
        });

        if (!user) {
            console.log("User not found");
            return;
        }

        console.log(`User ID: ${user.id}, Name: ${user.name}, Desig: ${user.designation}`);

        const logs = await prisma.workLog.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: new Date('2026-02-20'),
                    lte: new Date('2026-03-30')
                }
            },
            orderBy: { date: 'asc' }
        });

        console.log(`Found ${logs.length} logs`);
        logs.forEach(l => {
            console.log(`- Date: ${l.date.toISOString()}, Status: ${l.logStatus}, customFields: ${l.customFields ? JSON.stringify(l.customFields) : 'N/A'}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
