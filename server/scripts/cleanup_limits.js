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

        const getDaysInRange = (start, end, rangeStart, rangeEnd, type) => {
            if (type === 'HALF_DAY') return 0.5;
            const effectiveStart = new Date(Math.max(new Date(start), new Date(rangeStart)));
            const effectiveEnd = new Date(Math.min(new Date(end), new Date(rangeEnd)));
            if (effectiveStart > effectiveEnd) return 0;
            const diffTime = Math.abs(effectiveEnd - effectiveStart);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        };

        for (const req of pendingLeaves) {
            const requestStart = new Date(req.startDate);
            const requestEnd = new Date(req.endDate);

            const startCycleStart = getCycleStartDateIST(requestStart);
            const startCycleEnd = getCycleEndDateIST(requestStart);
            const endCycleStart = getCycleStartDateIST(requestEnd);
            const endCycleEnd = getCycleEndDateIST(requestEnd);

            const cyclesToCheck = [{ start: startCycleStart, end: startCycleEnd }];
            if (startCycleStart.getTime() !== endCycleStart.getTime()) {
                cyclesToCheck.push({ start: endCycleStart, end: endCycleEnd });
            }

            let shouldExceed = false;

            for (const cycle of cyclesToCheck) {
                const daysInThisCycle = getDaysInRange(requestStart, requestEnd, cycle.start, cycle.end, req.type);

                if (daysInThisCycle > 4) {
                    shouldExceed = true;
                    break;
                }

                const historicalLeaves = await prisma.leaveRequest.findMany({
                    where: {
                        userId: req.userId,
                        id: { lt: req.id },
                        OR: [
                            { startDate: { gte: cycle.start, lte: cycle.end } },
                            { endDate: { gte: cycle.start, lte: cycle.end } },
                            { AND: [{ startDate: { lte: cycle.start } }, { endDate: { gte: cycle.end } }] }
                        ],
                        status: { not: 'REJECTED' }
                    }
                });

                const existingDaysInCycle = historicalLeaves.reduce((sum, r) => {
                    return sum + getDaysInRange(r.startDate, r.endDate, cycle.start, cycle.end, r.type);
                }, 0);

                if ((existingDaysInCycle + daysInThisCycle) > 4) {
                    shouldExceed = true;
                    break;
                }
            }

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
