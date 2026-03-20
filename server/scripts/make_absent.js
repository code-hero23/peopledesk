const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAbsent(email, dateStr) {
    try {
        if (!email || !dateStr) {
            console.error('❌ Error: Missing arguments.');
            console.log('Usage: node scripts/make_absent.js <email> <YYYY-MM-DD>');
            console.log('Example: node scripts/make_absent.js employee@example.com 2026-03-20');
            return;
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email }
        });

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        // Parse date (assumes local time consistent with how app marks attendance)
        const [year, month, day] = dateStr.split('-').map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            console.error('❌ Invalid date format. Use YYYY-MM-DD');
            return;
        }

        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

        console.log(`--------------------------------------------------`);
        console.log(`MARKING AS ABSENT: ${user.name} (${email})`);
        console.log(`Date: ${startOfDay.toDateString()}`);
        console.log(`--------------------------------------------------`);

        // Find ALL records for the day
        const existingRecords = await prisma.attendance.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        if (existingRecords.length > 0) {
            console.log(`🔍 Found ${existingRecords.length} existing attendance records for this date.`);
            
            // Delete all records and their breaks
            const recordIds = existingRecords.map(r => r.id);
            console.log(`🗑️ Deleting all records and associated breaks...`);
            
            await prisma.breakLog.deleteMany({
                where: { attendanceId: { in: recordIds } }
            });

            await prisma.attendance.deleteMany({
                where: { id: { in: recordIds } }
            });

            console.log(`✅ Success! All records for this date have been DELETED.`);
            console.log(`(This will now show as "Absent / No Data" in the user's history.)`);
        } else {
            console.log(`ℹ️ No attendance records found for this user on ${dateStr}. Status is already "ABSENT".`);
        }

    } catch (error) {
        console.error('❌ An error occurred:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// CLI Execution
const args = process.argv.slice(2);
const emailArg = args[0];
const dateArg = args[1];

makeAbsent(emailArg, dateArg);
