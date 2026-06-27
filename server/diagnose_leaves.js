const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'its.cookscape@gmail.com';
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log(`User with email ${email} not found.`);
        return;
    }

    console.log(`User found: ${user.name} (ID: ${user.id})`);

    // Cycle: 26th May to 25th June
    const startDate = new Date(2026, 4, 26, 0, 0, 0); // May is index 4
    const endDate = new Date(2026, 5, 25, 23, 59, 59); // June is index 5

    console.log(`\n--- Fetching leaves overlapping cycle ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} ---`);
    const leaves = await prisma.leaveRequest.findMany({
        where: {
            userId: user.id,
            startDate: { lte: endDate },
            endDate: { gte: startDate }
        }
    });

    leaves.forEach(l => {
        const getOverlappingDays = (reqStart, reqEnd, cycleStart, cycleEnd) => {
            const start = new Date(Math.max(new Date(reqStart).setHours(0, 0, 0, 0), new Date(cycleStart).setHours(0, 0, 0, 0)));
            const end = new Date(Math.min(new Date(reqEnd).setHours(23, 59, 59, 999), new Date(cycleEnd).setHours(23, 59, 59, 999)));
            if (start > end) return 0;
            return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        };
        const overlap = getOverlappingDays(l.startDate, l.endDate, startDate, endDate);
        console.log(`Leave ID: ${l.id} | Type: ${l.type} | Start: ${l.startDate.toISOString()} | End: ${l.endDate.toISOString()} | Status: ${l.status} | Overlap in cycle: ${overlap} days`);
    });

    console.log('\n--- Fetching ALL leaves for user ---');
    const allLeaves = await prisma.leaveRequest.findMany({
        where: { userId: user.id }
    });
    allLeaves.forEach(l => {
        console.log(`Leave ID: ${l.id} | Type: ${l.type} | Start: ${l.startDate.toISOString()} | End: ${l.endDate.toISOString()} | Status: ${l.status}`);
    });

    await prisma.$disconnect();
}

main().catch(console.error);
