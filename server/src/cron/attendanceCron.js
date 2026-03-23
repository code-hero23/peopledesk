const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Run every day at 01:00 AM
const initAttendanceCron = () => {
    cron.schedule('0 1 * * *', async () => {
        console.log('--------------------------------');
        console.log('Running 3-Day Absence Check Cron Job');
        console.log(new Date().toLocaleString());

        const istOffset = 5.5 * 60 * 60 * 1000;
        const today = new Date(); // Added today declaration
        const istTime = new Date(today.getTime() + istOffset);
        const dayOfWeek = istTime.getUTCDay();

        if (dayOfWeek === 0) {
            console.log('Skipping sync: It is Sunday in IST.');
            return;
        }

        try {
            // 0. Auto-close stale breaks from previous days
            const yesterday = new Date(today);
            yesterday.setHours(0, 0, 0, 0);

            const staleBreaks = await prisma.breakLog.findMany({
                where: {
                    endTime: null,
                    startTime: { lt: yesterday }
                }
            });

            if (staleBreaks.length > 0) {
                console.log(`Cleaning up ${staleBreaks.length} stale breaks...`);
                for (const b of staleBreaks) {
                    // Close at end of their start day or just now?
                    // End of start day (23:59:59) is more accurate for duration
                    const breakEnd = new Date(b.startTime);
                    breakEnd.setHours(23, 59, 59, 999);
                    const duration = Math.round((breakEnd - new Date(b.startTime)) / 60000);

                    await prisma.breakLog.update({
                        where: { id: b.id },
                        data: {
                            endTime: breakEnd,
                            duration: duration
                        }
                    });
                }
            }
            console.log('Stale breaks cleanup completed.');
        } catch (error) {
            console.error('CRON ERROR in Attendance Cleanup:', error);
        }
    });

    console.log('Attendance Cron Job Initialized (Cleanup Only)');
};

module.exports = initAttendanceCron;
