const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Run every day at 01:00 AM
const initAttendanceCron = () => {
    cron.schedule('0 1 * * *', async () => {
        console.log('--------------------------------');
        console.log('Running 3-Day Absence Check Cron Job');
        console.log(new Date().toLocaleString());

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
                console.log('Stale breaks cleanup completed.');
            }

            // 1. Get all ACTIVE employees
            const activeUsers = await prisma.user.findMany({
                where: {
                    status: 'ACTIVE',
                    role: 'EMPLOYEE' // Only check standard employees, not admins/HODs? Or everyone?
                    // Let's target EMPLOYEE role for now to be safe, or ALL except ADMIN.
                    // User request said "employees".
                }
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Calculate check period: Yesterday, Day Before, Day Before That
            // We exclude "today" because today hasn't finished.
            // So looking for absence on: D-1, D-2, D-3.

            const checkDates = [];
            for (let i = 1; i <= 3; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                checkDates.push(d);
            }

            console.log(`Checking absences for: ${checkDates.map(d => d.toISOString().split('T')[0]).join(', ')}`);

            for (const user of activeUsers) {
                // Skip if user created recently (less than 4 days ago)
                const daysSinceCreation = (today - new Date(user.createdAt)) / (1000 * 60 * 60 * 24);
                if (daysSinceCreation < 4) continue;

                let consecutiveAbsences = 0;

                for (const dateToCheck of checkDates) {
                    const startOfDay = new Date(dateToCheck);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(dateToCheck);
                    endOfDay.setHours(23, 59, 59, 999);

                    // Check Attendance
                    const attendance = await prisma.attendance.findFirst({
                        where: {
                            userId: user.id,
                            date: { gte: startOfDay, lte: endOfDay }
                        }
                    });

                    if (!attendance) {
                        // Check Approved Request (Leave, Permission, Site Visit, Showroom Visit)
                        // Actually, mainly LEAVE. Site/Showroom visits usually imply "working outside" and should ideally have an "Attendance" entry marked by Admin or Auto-generated?
                        // Or if they are on "Site Visit", they might not "Check In" normally?
                        // If system requires Check-In even for Site Visit, then absence of Attendance is valid.
                        // But commonly, Leave is the excuse.

                        const onLeave = await prisma.leaveRequest.findFirst({
                            where: {
                                userId: user.id,
                                status: 'APPROVED',
                                startDate: { lte: endOfDay },
                                endDate: { gte: startOfDay }
                            }
                        });

                        if (!onLeave) {
                            // Check for Sunday? (If company is off on Sunday).
                            // Assuming 6-day or 5-day work week?
                            // Safest to NOT block if it's a Sunday?
                            // But "Continuous 3 days" usually implies e.g. Fri, Sat, Sun(off), Mon?
                            // Or Mon, Tue, Wed.
                            // If Sunday is off, absence is expected.
                            // Better logic: Count "Working Days" absence?
                            // Determining "Working Day" is complex without a holiday calendar.
                            // However, strictly "3 days" usually captures lazy loggers.
                            // Let's stick to strict 3 days for now as per request.

                            // Optimization: Check for Sunday.
                            if (dateToCheck.getDay() === 0) {
                                // It's Sunday. Should we count it as absence?
                                // Probably not. Let's start with strict count (including Sunday) breaks the logic?
                                // "continuous 3 days" usually implies business days.
                                // If I miss Sat, Sun (off), Mon. That is 3 days.
                                // If I miss Fri, Sat, Sun(off).
                                // Let's just count it. If they are blocked, they call HR.
                                consecutiveAbsences++;
                            } else {
                                consecutiveAbsences++;
                            }
                        }
                    }
                }

                if (consecutiveAbsences === 3) {
                    console.log(`BLOCKING User: ${user.name} (${user.email}) - 3 days absence`);

                    // Block User
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { status: 'BLOCKED' }
                    });

                    // Create Audit Log (Auto-generated?)
                    // If no AuditLog service, we just skip or try to create if model exists
                    // Model AuditLog exists.
                    await prisma.auditLog.create({
                        data: {
                            action: 'AUTO_BLOCK',
                            userId: user.id, // Who was affected?
                            details: 'Blocked due to 3 consecutive days of unexplained absence.'
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Error in Absence Cron:', error);
        }
    });

    console.log('Attendance Cron Job Initialized');
};

module.exports = initAttendanceCron;
