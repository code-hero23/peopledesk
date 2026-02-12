const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetLogin(email, dateStr) {
    try {
        if (!email) {
            console.log('Error: Please provide an email address.');
            console.log('Usage: node reset_login.js <email> [YYYY-MM-DD]');
            return;
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email }
        });

        if (!user) {
            console.log(`User not found: ${email}`);
            return;
        }

        // Parse date (default to today if not provided)
        const date = dateStr ? new Date(dateStr) : new Date();
        date.setHours(0, 0, 0, 0);

        // Next day for range query
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        console.log(`--------------------------------------------------`);
        console.log(`RESETTING LOGIN for: ${user.name} (${email})`);
        console.log(`Target Date: ${date.toDateString()}`);
        console.log(`--------------------------------------------------`);

        // 1. Find the Attendance Record
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: user.id,
                date: {
                    gte: date,
                    lt: nextDay
                }
            }
        });

        if (attendance) {
            // 2. Delete associated BreakLogs first (Foreign Key Constraint)
            const deletedBreaks = await prisma.breakLog.deleteMany({
                where: { attendanceId: attendance.id }
            });
            if (deletedBreaks.count > 0) {
                console.log(`✅ Deleted ${deletedBreaks.count} break logs.`);
            }

            // 3. Delete Attendance Record
            await prisma.attendance.delete({
                where: { id: attendance.id }
            });
            console.log(`✅ Deleted Attendance record (ID: ${attendance.id})`);
        } else {
            console.log(`ℹ️ No Attendance record found for this date.`);
        }

        // 4. Delete WorkLog Record
        const workLog = await prisma.workLog.findFirst({
            where: {
                userId: user.id,
                date: {
                    gte: date,
                    lt: nextDay
                }
            }
        });

        if (workLog) {
            await prisma.workLog.delete({
                where: { id: workLog.id }
            });
            console.log(`✅ Deleted WorkLog record (ID: ${workLog.id})`);
        } else {
            console.log(`ℹ️ No WorkLog record found for this date.`);
        }

        console.log(`--------------------------------------------------`);
        console.log(`Login reset complete! The user can now check in again.`);

    } catch (error) {
        console.error('❌ Error resetting login:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Usage: node reset_login.js <email> <optional_date_YYYY-MM-DD>
const email = process.argv[2];
const date = process.argv[3];

resetLogin(email, date);
