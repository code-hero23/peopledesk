const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date();

    const employees = await prisma.user.findMany({
        where: { role: 'EMPLOYEE', status: 'ACTIVE' },
        select: { id: true, name: true, designation: true }
    });

    const stats = await Promise.all(employees.map(async (emp) => {
        const attendance = await prisma.attendance.findMany({
            where: { userId: emp.id, date: { gte: startDate, lte: endDate } },
            include: { breaks: true }
        });

        const workLogsData = await prisma.workLog.findMany({
            where: { userId: emp.id, createdAt: { gte: startDate, lte: endDate } },
            select: { createdAt: true }
        });

        const uniqueDaysWithLogs = new Set(workLogsData.map(log => new Date(log.createdAt).toDateString())).size;
        const expectedMinutes = attendance.length * 540;
        const totalHours = 2.8; // Dummy for testing logic
        const expectedHours = Math.round((expectedMinutes / 60) * 10) / 10;

        return {
            name: emp.name,
            daysPresent: attendance.length,
            expectedMinutes,
            expectedHours
        };
    }));

    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
}

test();
