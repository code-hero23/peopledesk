const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetLogout(email, dateStr) {
    try {
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

        // Find the attendance record
        // Note: Prisma might have stored it with exact time or just the day.
        // We'll search for records for this user on this day.
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: user.id,
                date: {
                    gte: date,
                    lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });

        if (!attendance) {
            console.log(`No attendance record found for ${email} on ${date.toDateString()}`);
            return;
        }

        // Reset checkoutTime
        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkoutTime: null,
                checkoutPhoto: null
            }
        });

        console.log(`Successfully reset logout for ${email} (${user.name})`);
        console.log(`Date: ${date.toDateString()}`);
        console.log(`Records Updated: ${updated.id}`);
    } catch (error) {
        console.error('Error resetting logout:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Usage: node reset_logout.js <email> <optional_date_YYYY-MM-DD>
const email = process.argv[2];
const date = process.argv[3];

if (!email) {
    console.log('Please provide an email: node reset_logout.js employee@example.com');
} else {
    resetLogout(email, date);
}
