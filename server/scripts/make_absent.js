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
            },
            orderBy: { date: 'asc' }
        });

        if (existingRecords.length > 0) {
            console.log(`🔍 Found ${existingRecords.length} existing attendance records for this date.`);
            
            // Keep the first one, delete the rest
            const [keepRecord, ...deleteRecords] = existingRecords;

            if (deleteRecords.length > 0) {
                console.log(`🗑️ Deleting ${deleteRecords.length} duplicate/extra records...`);
                await prisma.attendance.deleteMany({
                    where: { id: { in: deleteRecords.map(r => r.id) } }
                });
            }

            await prisma.attendance.update({
                where: { id: keepRecord.id },
                data: {
                    status: 'ABSENT',
                    // Clear out presence data
                    checkInPhoto: null,
                    checkoutPhoto: null,
                    checkoutTime: null,
                    deviceInfo: null,
                    ipAddress: null,
                    checkoutDeviceInfo: null,
                    checkoutIpAddress: null
                }
            });

            // Also clear any active breaks for the kept record
            await prisma.breakLog.deleteMany({
                where: { attendanceId: keepRecord.id }
            });

            console.log(`✅ Success! Updated record (ID: ${keepRecord.id}) to ABSENT and cleared other data.`);
        } else {
            const newRecord = await prisma.attendance.create({
                data: {
                    userId: user.id,
                    date: startOfDay, // Store as midnight for clean history
                    status: 'ABSENT',
                }
            });
            console.log(`✅ Success! Created new ABSENT record (ID: ${newRecord.id}).`);
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
