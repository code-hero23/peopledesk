const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getCycleStartDateIST, getCycleEndDateIST } = require('../src/utils/dateHelpers');

async function fixLimits() {
    console.log('🚀 Starting Limit Flag Cleanup...');

    try {
        // 1. Fix Permissions
        const pendingPermissions = await prisma.permissionRequest.findMany({
            where: { status: 'PENDING' }
        });

        console.log(`Checking ${pendingPermissions.length} pending permissions...`);

        for (const req of pendingPermissions) {
            const cycleStart = getCycleStartDateIST(req.date);
            const cycleEnd = getCycleEndDateIST(req.date);

            const count = await prisma.permissionRequest.count({
                where: {
                    userId: req.userId,
                    date: { gte: cycleStart, lte: cycleEnd },
                    id: { lt: req.id } // Count previous requests in this cycle
                }
            });

            const shouldExceed = count >= 4;

            if (req.isExceededLimit !== shouldExceed) {
                await prisma.permissionRequest.update({
                    where: { id: req.id },
                    data: { isExceededLimit: shouldExceed }
                });
                console.log(`✅ Updated Permission ${req.id} (User ${req.userId}): ${req.isExceededLimit} -> ${shouldExceed}`);
            }
        }

        // 2. Fix Leaves
        const pendingLeaves = await prisma.leaveRequest.findMany({
            where: { status: 'PENDING' }
        });

        console.log(`Checking ${pendingLeaves.length} pending leaves...`);

        for (const req of pendingLeaves) {
            const cycleStart = getCycleStartDateIST(req.startDate);
            const cycleEnd = getCycleEndDateIST(req.startDate);

            const previousLeaves = await prisma.leaveRequest.findMany({
                where: {
                    userId: req.userId,
                    startDate: { gte: cycleStart, lte: cycleEnd },
                    id: { lt: req.id }
                }
            });

            const calculateDays = (start, end, type) => {
                if (type === 'HALF_DAY') return 0.5;
                const diffTime = Math.abs(new Date(end) - new Date(start));
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            };

            const totalExistingDays = previousLeaves.reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate, r.type), 0);
            const currentRequestDays = calculateDays(req.startDate, req.endDate, req.type);

            const shouldExceed = currentRequestDays > 4 || (totalExistingDays + currentRequestDays) > 4;

            if (req.isExceededLimit !== shouldExceed) {
                await prisma.leaveRequest.update({
                    where: { id: req.id },
                    data: { isExceededLimit: shouldExceed }
                });
                console.log(`✅ Updated Leave ${req.id} (User ${req.userId}): ${req.isExceededLimit} -> ${shouldExceed}`);
            }
        }

        console.log('✨ Cleanup Complete!');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixLimits();
