const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { normalizeBiometricDate, getCycleStartDateIST, getCycleEndDateIST } = require('./src/utils/dateHelpers');

async function test() {
    try {
        const month = 3;
        const year = 2026;
        const startDate = new Date(year, month - 2, 26, 0, 0, 0);
        const endDate = new Date(year, month - 1, 25, 23, 59, 59);
        const targetYear = year;

        console.log('Testing Payroll Logic...');
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE', role: 'EMPLOYEE' },
            take: 1
        });

        if (users.length === 0) {
            console.log('No users found');
            return;
        }

        const user = users[0];
        console.log(`Testing user: ${user.name}`);

        const [attendance, biometricLogs, leaves, permissions] = await Promise.all([
            prisma.attendance.findMany({
                where: { userId: user.id, date: { gte: startDate, lte: endDate } },
                include: { breaks: true }
            }),
            prisma.biometricLog.findMany({
                where: { userId: user.id, punchTime: { gte: new Date(year - 1, 0, 1), lte: new Date(year + 1, 11, 31) } }
            }),
            prisma.leaveRequest.findMany({
                where: { userId: user.id, status: 'APPROVED', startDate: { lte: endDate }, endDate: { gte: startDate } }
            }),
            prisma.permissionRequest.findMany({
                where: { userId: user.id, status: 'APPROVED', date: { gte: startDate, lte: endDate } }
            })
        ]);

        console.log('Queries successful');
        console.log(`Attendance count: ${attendance.length}`);
        console.log(`Biometric count: ${biometricLogs.length}`);

        const bioDays = new Set();
        biometricLogs.forEach(log => {
            const norm = normalizeBiometricDate(log.punchTime, targetYear);
            console.log(`Original: ${log.timestamp}, Normalized: ${norm}`);
            if (norm >= startDate && norm <= endDate) {
                bioDays.add(norm.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }));
            }
        });

        console.log(`Bio days size: ${bioDays.size}`);
        console.log('Success!');
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
