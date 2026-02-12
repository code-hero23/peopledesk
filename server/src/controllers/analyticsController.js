const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to format minutes to "Xh Ym"
const formatMinutes = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

// Calculate punctuality relative to 10:00 AM
const calculatePunctuality = (checkInTime) => {
    // 1. Convert DB time (likely UTC) to IST by adding 5.5 hours
    const utcDate = new Date(checkInTime);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const checkInIST = new Date(utcDate.getTime() + istOffset);

    // 2. Create Target Time (10:00 AM) on the SAME DATE as the check-in
    const target = new Date(checkInIST);
    target.setHours(10, 0, 0, 0);

    // 3. Compare difference
    const diffMinutes = (checkInIST - target) / (1000 * 60);
    return diffMinutes; // Positive means late, negative means early
};

const getEmployeeStats = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        const userId = parseInt(id);

        // 1. Get Attendance Data
        const attendance = await prisma.attendance.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            include: { breaks: true }
        });

        // 2. Get Work Logs
        const workLogs = await prisma.workLog.findMany({
            where: {
                userId,
                createdAt: { gte: start, lte: end }
            }
        });

        // 3. Get Requests (to check for flags)
        const [leaves, permissions] = await Promise.all([
            prisma.leaveRequest.findMany({ where: { userId, createdAt: { gte: start, lte: end } } }),
            prisma.permissionRequest.findMany({ where: { userId, createdAt: { gte: start, lte: end } } })
        ]);

        // CALCULATIONS
        const totalDaysPresent = attendance.length;
        const daysWithLogs = new Set(workLogs.map(log => new Date(log.createdAt).toDateString())).size;

        const consistencyScore = totalDaysPresent > 0 ? (daysWithLogs / totalDaysPresent) * 100 : 0;

        let totalNetMinutes = 0;
        let totalLateness = 0;
        let punctualityCount = 0;

        attendance.forEach(record => {
            if (record.date) {
                totalLateness += calculatePunctuality(record.date);
                punctualityCount++;
            }

            if (record.date && record.checkoutTime) {
                const gross = (new Date(record.checkoutTime) - new Date(record.date)) / (1000 * 60);
                const personalBreaks = record.breaks
                    .filter(b => b.type === 'TEA' || b.type === 'LUNCH')
                    .reduce((acc, b) => acc + (b.endTime ? (new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60) : 0), 0);

                totalNetMinutes += (gross - personalBreaks);
            }
        });

        const avgLateness = punctualityCount > 0 ? totalLateness / punctualityCount : 0;
        const expectedMinutes = totalDaysPresent * 540; // 9 hours * 60 mins
        const efficiencyScore = expectedMinutes > 0 ? (totalNetMinutes / expectedMinutes) * 100 : 0;

        const limitExceededFlags = leaves.filter(r => r.isExceededLimit).length + permissions.filter(r => r.isExceededLimit).length;

        // Daily Trends for Graph
        const dailyTrends = attendance.map(record => {
            const gross = record.date && record.checkoutTime ? (new Date(record.checkoutTime) - new Date(record.date)) / (1000 * 60) : 0;
            const personalBreaks = record.breaks
                .filter(b => b.type === 'TEA' || b.type === 'LUNCH')
                .reduce((acc, b) => acc + (b.endTime ? (new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60) : 0), 0);

            const net = Math.max(0, gross - personalBreaks);
            const eff = Math.round((net / 540) * 100);

            return {
                date: new Date(record.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
                efficiency: eff
            };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            consistencyScore: Math.round(consistencyScore),
            efficiencyScore: Math.round(efficiencyScore),
            avgLateness: Math.round(avgLateness),
            limitExceededFlags,
            totalNetTime: formatMinutes(Math.round(totalNetMinutes)),
            totalDaysPresent,
            daysWithLogs,
            dailyTrends
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error calculating analytics' });
    }
};

const getTeamOverview = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        const employees = await prisma.user.findMany({
            where: { role: 'EMPLOYEE', status: 'ACTIVE' },
            select: { id: true, name: true, designation: true }
        });

        const stats = await Promise.all(employees.map(async (emp) => {
            const attendance = await prisma.attendance.findMany({
                where: { userId: emp.id, date: { gte: start, lte: end } },
                include: { breaks: true }
            });

            const workLogsData = await prisma.workLog.findMany({
                where: { userId: emp.id, createdAt: { gte: start, lte: end } },
                select: { createdAt: true }
            });

            const uniqueDaysWithLogs = new Set(workLogsData.map(log => new Date(log.createdAt).toDateString())).size;
            const logsCount = workLogsData.length; // Total reports submitted

            let totalNetMinutes = 0;
            let totalLateness = 0;
            let punctualityCount = 0;

            attendance.forEach(record => {
                if (record.date) {
                    totalLateness += calculatePunctuality(record.date);
                    punctualityCount++;

                    if (record.checkoutTime) {
                        const gross = (new Date(record.checkoutTime) - new Date(record.date)) / (1000 * 60);
                        // Calculate breaks
                        const breakTime = record.breaks
                            ? record.breaks
                                .filter(b => b.type === 'TEA' || b.type === 'LUNCH')
                                .reduce((acc, b) => acc + (b.endTime ? (new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60) : 0), 0)
                            : 0;
                        totalNetMinutes += (gross - breakTime);
                    }
                }
            });

            const expectedMinutes = attendance.length * 540; // 9 hours * 60 mins
            const efficiency = expectedMinutes > 0 ? (totalNetMinutes / expectedMinutes) * 100 : 0;
            const consistency = attendance.length > 0 ? (uniqueDaysWithLogs / attendance.length) * 100 : 0;
            const avgLateness = punctualityCount > 0 ? Math.round(totalLateness / punctualityCount) : 0;
            const totalHours = Math.round((totalNetMinutes / 60) * 10) / 10; // 1 decimal place

            return {
                id: emp.id,
                name: emp.name,
                designation: emp.designation,
                efficiency: Math.min(100, Math.round(efficiency)), // Cap at 100 for display
                consistency: Math.min(100, Math.round(consistency)), // Cap at 100
                daysPresent: attendance.length,
                totalHours: totalHours,
                logsSubmitted: logsCount, // Show actual number of reports
                avgLateness: avgLateness > 0 ? avgLateness : 0
            };
        }));

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching team overview' });
    }
};

module.exports = {
    getEmployeeStats,
    getTeamOverview
};
