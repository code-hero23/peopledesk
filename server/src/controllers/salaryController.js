const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getCycleStartDateIST, getCycleEndDateIST, getStartOfDayIST, getEndOfDayIST, getLatestCompletedCycle } = require('../utils/dateHelpers');

// @desc    Get employee salary summary for current or historical cycle
// @route   GET /api/salary/my-summary
// @access  Private (Employee)
const getMySalarySummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month, year } = req.query;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                allocatedSalary: true,
                salaryViewEnabled: true,
                salaryDeductions: true,
                salaryDeductionBreakdown: true,
                designation: true,
                timeShortageDeductionEnabled: true
            }
        });

        // Initial Check: Fetch Global Settings (Safe fetch)
        let isGlobalDashboardEnabled = true;
        let isGlobalShortageEnabled = true;
        let calculationMode = 'AUTO';
        try {
            const settings = await prisma.globalSetting.findMany();
            const dashboardSetting = settings.find(s => s.key === 'isSalaryDashboardEnabled');
            const shortageSetting = settings.find(s => s.key === 'isGlobalShortageDeductionEnabled');
            const modeSetting = settings.find(s => s.key === 'payrollCalculationMode');

            if (dashboardSetting) isGlobalDashboardEnabled = dashboardSetting.value !== 'false';
            if (shortageSetting) isGlobalShortageEnabled = shortageSetting.value === 'true';
            if (modeSetting) calculationMode = modeSetting.value;
        } catch (dbError) {
            console.error('Global settings error:', dbError.message);
        }

        if (!isGlobalDashboardEnabled) {
            return res.status(200).json({
                disabled: true,
                message: 'Global Salary Dashboard is currently disabled by Admin. Please contact HR for details.'
            });
        }

        if (!user.salaryViewEnabled) {
            return res.status(200).json({ message: 'This month cycle is completed wait for next month cycle' });
        }

        let start, end;
        if (month !== undefined && year !== undefined) {
            // UI sends 1-12 (e.g. 2 for Feb). 
            // We want Jan 26 - Feb 25.
            // Jan is month 0 internally. 
            // So for Feb (2), we need m = 0.
            let m = parseInt(month) - 2;
            let y = parseInt(year);
            if (m < 0) {
                m += 12;
                y -= 1;
            }
            start = getCycleStartDateIST(null, y, m);
            end = getCycleEndDateIST(null, y, m);
        } else {
            // Default to the LATEST COMPLETED cycle
            const latest = getLatestCompletedCycle();
            start = getCycleStartDateIST(null, latest.year, latest.month);
            end = getCycleEndDateIST(null, latest.year, latest.month);
        }

        // 1. Fetch Attendance (Working Days)
        const attendance = await prisma.attendance.findMany({
            where: { userId, date: { gte: start, lte: end } },
            include: { breaks: true }
        });
        const presentDays = attendance.length;

        // Total days in period (approx 30 for salary math, but exact for stats)
        const totalDaysInPeriod = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const absentDays = Math.max(0, totalDaysInPeriod - presentDays);

        // 2. Fetch Approved Leaves & Permissions
        const [leaves, permissions] = await Promise.all([
            prisma.leaveRequest.findMany({
                where: { userId, status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } }
            }),
            prisma.permissionRequest.findMany({
                where: { userId, status: 'APPROVED', date: { gte: start, lte: end } }
            })
        ]);

        const approvedLeaves = leaves.length;
        const approvedPermissions = permissions.length;

        // 3. Calculate Working Hours (Actual)
        let totalMinutes = 0;
        attendance.forEach(record => {
            if (record.checkoutTime && record.date) {
                const grossMinutes = Math.floor((new Date(record.checkoutTime) - new Date(record.date)) / (1000 * 60));
                let breakMins = 0;
                record.breaks.forEach(b => {
                    if (['TEA', 'LUNCH'].includes(b.breakType)) breakMins += (b.duration || 0);
                });
                totalMinutes += (grossMinutes - breakMins);
            }
        });
        const actualWorkingHours = totalMinutes / 60;

        // 4. Excel Math Logic
        const allocated = user.allocatedSalary || 0;

        // Cycle context for deduction filtering
        const reqMonth = month ? parseInt(month) : (getLatestCompletedCycle().month + 2 > 12 ? 1 : getLatestCompletedCycle().month + 2);
        const reqYear = year ? parseInt(year) : (getLatestCompletedCycle().month + 2 > 12 ? getLatestCompletedCycle().year + 1 : getLatestCompletedCycle().year);

        // Sum deductions from breakdown (Filtered by Cycle)
        const allDeductions = user.salaryDeductionBreakdown || [];
        const filteredDeductions = allDeductions.filter(item => {
            // Legacy support: if isFixed is missing, treat as Fixed (True)
            const isFixed = item.isFixed !== undefined ? item.isFixed : true;
            if (isFixed) return true;

            // Cycle-specific: must match exactly
            return parseInt(item.month) === reqMonth && parseInt(item.year) === reqYear;
        });

        const manualDeductions = filteredDeductions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (user.salaryDeductions || 0);

        // A. Absenteeism LOP (Buffer of 4 days)
        const lopDays = Math.max(0, absentDays - 4);
        const absenteeismDeduction = lopDays * (allocated / 30);

        // B. Time Shortage Deduction (respect global and individual toggle)
        let shortageDeduction = 0;
        let shortageHours = 0;
        let expectedHours = 0;
        let permissionCreditHours = 0;

        // Date Display Formatting (Fixing IST display)
        const formatDate = (d) => {
            if (!d) return '';
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(d.getTime() + istOffset);
            return istDate.toISOString().split('T')[0];
        };

        // --- NEW: Manual Mode Logic ---
        if (calculationMode === 'MANUAL') {
            const manualData = await prisma.manualPayroll.findUnique({
                where: {
                    email_month_year: {
                        email: req.user.email,
                        month: reqMonth,
                        year: reqYear
                    }
                }
            });

            if (manualData) {
                return res.json({
                    isManual: true,
                    cycle: {
                        start: formatDate(start),
                        end: formatDate(end),
                        totalDays: totalDaysInPeriod
                    },
                    stats: {
                        presentDays,
                        absentDays,
                        approvedLeaves,
                        approvedPermissions,
                        actualWorkingHours: parseFloat(actualWorkingHours.toFixed(2)),
                    },
                    financials: {
                        allocatedSalary: manualData.allocatedSalary,
                        absenteeismDeduction: manualData.absenteeismDeduction,
                        shortageDeduction: manualData.shortageDeduction,
                        manualDeductions: manualData.manualDeductions,
                        onHandSalary: Math.round(manualData.netPayout)
                    }
                });
            }
        }
        // ------------------------------

        if (isGlobalShortageEnabled && user.timeShortageDeductionEnabled) {
            expectedHours = presentDays * 8;
            const creditedPermissionCount = Math.min(approvedPermissions, 4); // Max 4 perms allowed
            permissionCreditHours = creditedPermissionCount * 2;
            shortageHours = Math.max(0, expectedHours - permissionCreditHours - actualWorkingHours);
            shortageDeduction = shortageHours * (allocated / 240);
        }

        // Final Payout
        const onHandSalary = Math.max(0, allocated - absenteeismDeduction - shortageDeduction - manualDeductions);

        res.json({
            cycle: {
                start: formatDate(start),
                end: formatDate(end),
                totalDays: totalDaysInPeriod
            },
            stats: {
                presentDays,
                absentDays,
                approvedLeaves,
                approvedPermissions,
                permissionCreditHours,
                actualWorkingHours: parseFloat(actualWorkingHours.toFixed(2)),
                expectedHours,
                shortageHours: parseFloat(shortageHours.toFixed(2))
            },
            financials: {
                allocatedSalary: allocated,
                absenteeismDeduction: parseFloat(absenteeismDeduction.toFixed(2)),
                shortageDeduction: parseFloat(shortageDeduction.toFixed(2)),
                manualDeductions: manualDeductions,
                deductionBreakdown: filteredDeductions,
                onHandSalary: Math.round(onHandSalary)
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getMySalarySummary
};
