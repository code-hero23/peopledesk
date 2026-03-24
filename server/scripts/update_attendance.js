const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to check next item in args list
function getFlagValue(args, flag) {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
        return args[index + 1];
    }
    return null;
}

// Helper: Sets Hours/Minutes on a base date object and adjusts for IST (-5:30)
function setTimeOnDate(baseDate, timeStr) {
    if (!timeStr) return null;
    if (timeStr === 'null' || timeStr === 'clear') return 'CLEAR';

    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Create UTC date for that specific time on that day
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();
    
    // 10:25 AM IST = 04:55 AM UTC
    const newDate = new Date(Date.UTC(year, month, day, hours, minutes) - (5.5 * 60 * 60 * 1000));
    return newDate;
}

async function updateAttendance(email, dateStr, checkInTimeStr, checkOutTimeStr) {
    try {
        // Validation
        if (!email) {
            console.error('❌ Error: Email is required.');
            console.log('Usage: node scripts/update_attendance.js <email> [YYYY-MM-DD] --in "HH:mm" --out "HH:mm"');
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

        // Determine Target Date
        // If dateStr starts with '--', it's likely a flag, so assume Today
        let targetDate = new Date();
        let isDateProvided = true;

        if (!dateStr || dateStr.startsWith('--')) {
            // targetDate remains Today
            isDateProvided = false;
        } else {
            targetDate = new Date(dateStr);
        }

        // Normalize for finding record (start of day)
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);

        console.log(`--------------------------------------------------`);
        console.log(`UPDATING ATTENDANCE for: ${user.name} (${email})`);
        console.log(`Target Date: ${targetDate.toLocaleDateString()}`);
        console.log(`Input Check-In: ${checkInTimeStr || '(No Change)'}`);
        console.log(`Input Check-Out: ${checkOutTimeStr || '(No Change)'}`);
        console.log(`--------------------------------------------------`);

        // Find the Attendance Record
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: user.id,
                date: {
                    gte: targetDate,
                    lt: nextDay
                }
            }
        });

        if (!attendance) {
            console.log(`⚠️ No attendance record found for this date. Creating a new one...`);
            
            const newCheckIn = setTimeOnDate(targetDate, checkInTimeStr || '09:00');
            const newCheckOut = checkOutTimeStr ? setTimeOnDate(targetDate, checkOutTimeStr) : null;

            const createdRecord = await prisma.attendance.create({
                data: {
                    userId: user.id,
                    date: newCheckIn,
                    status: 'PRESENT',
                    checkoutTime: newCheckOut === 'CLEAR' ? null : newCheckOut,
                    deviceInfo: 'Manual Script Update'
                }
            });

            console.log(`✅ Success! New attendance record created.`);
            console.log(`Check-In:  ${createdRecord.date.toLocaleString()}`);
            console.log(`Check-Out: ${createdRecord.checkoutTime ? createdRecord.checkoutTime.toLocaleString() : 'Not Checked Out'}`);
            return;
        }

        // Prepare Updates
        const updateData = {};

        if (checkInTimeStr) {
            const newCheckIn = setTimeOnDate(targetDate, checkInTimeStr);
            if (newCheckIn !== 'CLEAR') {
                updateData.date = newCheckIn;
            }
        }

        if (checkOutTimeStr) {
            const newCheckOut = setTimeOnDate(targetDate, checkOutTimeStr);
            if (newCheckOut === 'CLEAR') {
                updateData.checkoutTime = null;
            } else {
                updateData.checkoutTime = newCheckOut;
            }
        }

        if (Object.keys(updateData).length === 0) {
            console.log(`⚠️ No changes specified. Use --in "HH:mm" or --out "HH:mm"`);
            return;
        }

        // Perform Update
        const updatedRecord = await prisma.attendance.update({
            where: { id: attendance.id },
            data: updateData
        });

        console.log(`✅ Success! Attendance updated.`);
        console.log(`Check-In:  ${updatedRecord.date.toLocaleTimeString()}`);
        console.log(`Check-Out: ${updatedRecord.checkoutTime ? updatedRecord.checkoutTime.toLocaleTimeString() : 'Not Checked Out'}`);

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// CLI Parsing
const args = process.argv.slice(2);
const emailArg = args[0];
const dateArg = args[1];

const inFlag = getFlagValue(args, '--in');
const outFlag = getFlagValue(args, '--out');

updateAttendance(emailArg, dateArg, inFlag, outFlag);
