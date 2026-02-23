const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLegacyLeaves() {
    console.log('Starting legacy leaves cleanup...');
    try {
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                isExceededLimit: false
            }
        });

        console.log(`Checking ${leaves.length} records...`);
        let count = 0;

        for (const req of leaves) {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays > 4) {
                await prisma.leaveRequest.update({
                    where: { id: req.id },
                    data: { isExceededLimit: true }
                });
                console.log(`Updated leave request ID ${req.id} (${diffDays} days)`);
                count++;
            }
        }

        console.log(`Cleanup completed. ${count} records updated.`);
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixLegacyLeaves();
