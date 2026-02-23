const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runImmediateCleanup() {
    console.log('--- STARTING IMMEDIATE STALE BREAK CLEANUP ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // Find all breaks that started BEFORE today and are still open (endTime is null)
        const staleBreaks = await prisma.breakLog.findMany({
            where: {
                endTime: null,
                startTime: { lt: today }
            }
        });

        if (staleBreaks.length === 0) {
            console.log('No stale breaks found from previous days. Everything is clean!');
            return;
        }

        console.log(`Found ${staleBreaks.length} stale breaks. Processing...`);

        for (const b of staleBreaks) {
            // Set end time to 11:59:59 PM of the day it started
            const breakStart = new Date(b.startTime);
            const breakEnd = new Date(breakStart);
            breakEnd.setHours(23, 59, 59, 999);

            const duration = Math.round((breakEnd - breakStart) / 60000);

            await prisma.breakLog.update({
                where: { id: b.id },
                data: {
                    endTime: breakEnd,
                    duration: duration
                }
            });
            console.log(`[FIXED] Break ID ${b.id} | Start: ${breakStart.toLocaleString()} | Duration: ${duration} mins`);
        }

        console.log('--- CLEANUP COMPLETED SUCCESSFULLY ---');
        console.log('All previous days stale breaks have been closed.');

    } catch (error) {
        console.error('CRITICAL ERROR DURING CLEANUP:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runImmediateCleanup();
