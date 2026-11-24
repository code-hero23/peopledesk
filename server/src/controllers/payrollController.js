const prisma = require('../config/prisma');
const excelJS = require('exceljs');
const { getCycleStartDateIST, getCycleEndDateIST, normalizeBiometricDate } = require('../utils/dateHelpers');

// Helper: Format minutes into HH:MM string
const formatHHMM = (totalMinutes) => {
    if (!totalMinutes || isNaN(totalMinutes) || totalMinutes <= 0) return "00:00";
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper: Clean non-numeric characters for currency/number parsing
const cleanNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = val.toString().replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

// Helper: Parse manual deductions from breakdown for a given cycle
const parseDeductionsFromBreakdown = (user, cycleMonth, cycleYear) => {
    let allDeductions = user.salaryDeductionBreakdown;
    if (typeof allDeductions === 'string') {
        try { allDeductions = JSON.parse(allDeductions); } catch (e) { allDeductions = []; }
    }
    if (!Array.isArray(allDeductions)) {
        allDeductions = [];
    }

    const filtered = allDeductions.filter(item => {
        // If isFixed is missing or true, applies to every cycle
        const isFixed = item.isFixed !== undefined ? item.isFixed : true;
        if (isFixed) return true;

        // Cycle-specific: must match requested cycle exactly
        return parseInt(item.month) === cycleMonth && parseInt(item.year) === cycleYear;
    });

    const breakdownSum = filtered.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const directDeductions = parseFloat(user.salaryDeductions) || 0;
    return Math.round(breakdownSum + directDeductions);
};

// @desc    Generate Comprehensive Payroll & Salary Excel Report
// @route   GET /api/payroll/report
// @access  Private (Admin, HR, Business Head, Accounts Manager)
const generatePayrollReport = async (req, res) => {
    try {
        const { month, year, format } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        const m = parseInt(month, 10);
        const y = parseInt(year, 10);

        if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 2000 || y > 2100) {
            return res.status(400).json({ message: 'Invalid month or year provided' });
        }

        // Standard Payroll Cycle: 26th of (m-1) to 25th of m
        // Example: Month 2 (Feb) 2026 -> 26 Jan 2026 00:00:00 IST to 25 Feb 2026 23:59:59.999 IST
        let prevM = m - 2; // 0-indexed internal month
        let prevY = y;
        if (prevM < 0) {
            prevM += 12;
            prevY -= 1;
        }

        const startDate = getCycleStartDateIST(null, prevY, prevM);
        const endDate = getCycleEndDateIST(null, y, m - 1);
        const targetYear = y;

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const prevMonthName = monthNames[prevM];
        const curMonthName = monthNames[m - 1];
        const cycleLabel = `26 ${prevMonthName} ${prevY} to 25 ${curMonthName} ${y}`;

        // Total calendar days in the cycle period
        const totalCycleDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // Count Sundays (standard weekly offs)
        let sundaysCount = 0;
        let iterDate = new Date(startDate.getTime() + (5.5 * 60 * 60 * 1000));
        const endIST = new Date(endDate.getTime() + (5.5 * 60 * 60 * 1000));
        while (iterDate <= endIST) {
            if (iterDate.getUTCDay() === 0) sundaysCount++;
            iterDate.setUTCDate(iterDate.getUTCDate() + 1);
        }

        // 1. Determine user scope based on requester role
        let userWhere = { status: 'ACTIVE' };
        if (req.user.role === 'AE_MANAGER') {
            userWhere.designation = 'AE';
        } else if (req.user.role === 'BUSINESS_HEAD' && !req.user.isGlobalAccess) {
            userWhere.reportingBhId = req.user.id;
        } else {
            // Admin, HR, Accounts Manager: all active staff, exclude Admin account itself
            userWhere.role = { not: 'ADMIN' };
        }

        const users = await prisma.user.findMany({
            where: userWhere,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                designation: true,
                allocatedSalary: true,
                salaryDeductions: true,
                salaryDeductionBreakdown: true,
                timeShortageDeductionEnabled: true,
                biometricId: true
            },
            orderBy: { name: 'asc' }
        });

        const userIds = users.map(u => u.id);

        // 2. Fetch all cycle attendance, biometric logs, leaves, permissions, manual payroll records, and global settings in parallel
        const [allAttendance, allBioLogs, allLeaves, allPermissions, manualPayrolls, settings] = await Promise.all([
            prisma.attendance.findMany({
                where: { userId: { in: userIds }, date: { gte: startDate, lte: endDate } },
                include: { breaks: true }
            }),
            prisma.biometricLog.findMany({
                where: {
                    userId: { in: userIds },
                    punchTime: { gte: new Date(y - 1, 0, 1), lte: new Date(y + 1, 11, 31) }
                }
            }),
            prisma.leaveRequest.findMany({
                where: {
                    userId: { in: userIds },
                    status: { in: ['APPROVED', 'PENDING'] },
                    startDate: { lte: endDate },
                    endDate: { gte: startDate }
                }
            }),
            prisma.permissionRequest.findMany({
                where: {
                    userId: { in: userIds },
                    status: { in: ['APPROVED', 'PENDING'] },
                    date: { gte: startDate, lte: endDate }
                }
            }),
            prisma.manualPayroll.findMany({
                where: { month: m, year: y }
            }).catch(() => []),
            prisma.globalSetting.findMany().catch(() => [])
        ]);

        // Global settings inspection
        const shortageSetting = settings.find(s => s.key === 'isGlobalShortageDeductionEnabled');
        const modeSetting = settings.find(s => s.key === 'payrollCalculationMode');
        const isGlobalShortageEnabled = shortageSetting ? shortageSetting.value === 'true' : true;
        const globalCalculationMode = modeSetting ? modeSetting.value : 'AUTO';

        // Manual payroll map by email
        const manualMap = new Map();
        manualPayrolls.forEach(mp => {
            if (mp && mp.email) manualMap.set(mp.email.toLowerCase(), mp);
        });

        // 3. Prepare Aggregation Maps
        const attendanceMap = new Map();
        const bioMap = new Map();
        const netMinutesMap = new Map();
        const leaveMap = new Map();
        const permissionMap = new Map();

        userIds.forEach(id => {
            attendanceMap.set(id, new Set());
            bioMap.set(id, new Set());
            netMinutesMap.set(id, 0);
            leaveMap.set(id, { approvedFull: 0, approvedHalf: 0, pendingFull: 0, pendingHalf: 0 });
            permissionMap.set(id, { approved: 0, pending: 0 });
        });

        // Populate PeopleDesk Attendance & Net Work Minutes
        allAttendance.forEach(a => {
            const dateStr = new Date(a.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            attendanceMap.get(a.userId)?.add(dateStr);

            if (a.checkoutTime && a.date) {
                const clockIn = new Date(a.date);
                const clockOut = new Date(a.checkoutTime);
                const grossMinutes = Math.max(0, (clockOut - clockIn) / (1000 * 60));

                let breakMinutes = 0;
                if (a.breaks && Array.isArray(a.breaks)) {
                    a.breaks.forEach(b => {
                        if (['TEA', 'LUNCH'].includes(b.breakType)) {
                            breakMinutes += (b.duration || 0);
                        }
                    });
                }
                const netMinutes = Math.max(0, grossMinutes - breakMinutes);
                netMinutesMap.set(a.userId, (netMinutesMap.get(a.userId) || 0) + netMinutes);
            }
        });

        // Populate Normalized Biometric Punches
        allBioLogs.forEach(log => {
            const norm = normalizeBiometricDate(log.punchTime, targetYear);
            if (norm && norm >= startDate && norm <= endDate) {
                const dateStr = norm.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                bioMap.get(log.userId)?.add(dateStr);
            }
        });

        // Populate Leave Overlaps within Cycle
        allLeaves.forEach(l => {
            const startOverlap = new Date(Math.max(new Date(l.startDate).setHours(0, 0, 0, 0), startDate.getTime()));
            const endOverlap = new Date(Math.min(new Date(l.endDate).setHours(23, 59, 59, 999), endDate.getTime()));
            if (startOverlap <= endOverlap) {
                const days = Math.max(1, Math.ceil((endOverlap - startOverlap) / (1000 * 60 * 60 * 24)));
                const userLeave = leaveMap.get(l.userId);
                if (userLeave) {
                    if (l.status === 'APPROVED') {
                        if (l.type === 'HALF_DAY') userLeave.approvedHalf += days;
                        else userLeave.approvedFull += days;
                    } else if (l.status === 'PENDING') {
                        if (l.type === 'HALF_DAY') userLeave.pendingHalf += days;
                        else userLeave.pendingFull += days;
                    }
                }
            }
        });

        // Populate Permissions
        allPermissions.forEach(p => {
            const userPerm = permissionMap.get(p.userId);
            if (userPerm) {
                if (p.status === 'APPROVED') userPerm.approved++;
                else if (p.status === 'PENDING') userPerm.pending++;
            }
        });

        // 4. Calculate Final Payroll Matrix for Each Employee
        const employeeDataList = [];

        users.forEach((user, idx) => {
            const pdDays = attendanceMap.get(user.id)?.size || 0;
            const bioDays = bioMap.get(user.id)?.size || 0;
            const effectivePresentDays = Math.max(pdDays, bioDays);

            const leaves = leaveMap.get(user.id) || { approvedFull: 0, approvedHalf: 0, pendingFull: 0, pendingHalf: 0 };
            const permissions = permissionMap.get(user.id) || { approved: 0, pending: 0 };

            // Hours & Shortage Math
            const netMinutes = netMinutesMap.get(user.id) || 0;
            const actualHours = parseFloat((netMinutes / 60).toFixed(2));
            const expectedShiftMinutes = pdDays * 520; // 8h 40m = 520 mins standard shift
            const expectedHours8 = pdDays * 8; // 8h daily basis for shortage deduction

            // Up to 4 approved permissions credited (2 hrs each = max 8 hrs credit)
            const creditedPermissions = Math.min(permissions.approved, 4);
            const permissionCreditHours = creditedPermissions * 2;
            const shortageHours = Math.max(0, parseFloat((expectedHours8 - permissionCreditHours - actualHours).toFixed(2)));

            // Absent Days & LOP Days (Company Policy: 4 buffer days for weekly offs)
            const absentDays = Math.max(0, totalCycleDays - pdDays);
            const lopDays = Math.max(0, absentDays - 4);

            // Financial Calculations
            const manualData = manualMap.get(user.email.toLowerCase());
            const isManualModeActive = globalCalculationMode === 'MANUAL';
            const useManual = manualData && (isManualModeActive || manualData.netPayout !== undefined);

            let allocatedSalary = 0;
            let absenteeismDeduction = 0;
            let shortageDeduction = 0;
            let manualDeductions = 0;
            let netPayout = 0;
            let calculationSource = 'AUTO';
            let remarks = '';

            if (useManual) {
                allocatedSalary = Math.round(cleanNumber(manualData.allocatedSalary));
                absenteeismDeduction = Math.round(cleanNumber(manualData.absenteeismDeduction));
                shortageDeduction = Math.round(cleanNumber(manualData.shortageDeduction));
                manualDeductions = Math.round(cleanNumber(manualData.manualDeductions));
                netPayout = Math.round(cleanNumber(manualData.netPayout));
                calculationSource = 'MANUAL';
                remarks = manualData.remarks || 'Manual Override';
            } else {
                allocatedSalary = Math.round(user.allocatedSalary || 0);

                // A. Absenteeism LOP: lopDays * (allocatedSalary / 30)
                absenteeismDeduction = Math.round(lopDays * (allocatedSalary / 30));

                // B. Time Shortage Deduction: shortageHours * (allocatedSalary / 240)
                if (isGlobalShortageEnabled && user.timeShortageDeductionEnabled) {
                    shortageDeduction = Math.round(shortageHours * (allocatedSalary / 240));
                }

                // C. Manual / Cycle Specific Deductions
                manualDeductions = parseDeductionsFromBreakdown(user, m, y);

                // D. Net Payout
                netPayout = Math.max(0, Math.round(allocatedSalary - absenteeismDeduction - shortageDeduction - manualDeductions));
                calculationSource = 'AUTO';
                remarks = '';
            }

            employeeDataList.push({
                sno: idx + 1,
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || 'N/A',
                designation: user.designation || 'N/A',
                role: user.role,
                totalCycleDays,
                workingDaysPD: pdDays,
                workingDaysBio: bioDays,
                effectivePresentDays,
                approvedLeavesFull: leaves.approvedFull,
                approvedLeavesHalf: leaves.approvedHalf,
                pendingLeavesFull: leaves.pendingFull,
                pendingLeavesHalf: leaves.pendingHalf,
                approvedPermissions: permissions.approved,
                pendingPermissions: permissions.pending,
                permissionCreditHours,
                lopDays,
                actualMinutes,
                actualHours,
                actualHoursFormatted: formatHHMM(netMinutes),
                expectedShiftMinutes,
                expectedShiftHoursFormatted: formatHHMM(expectedShiftMinutes),
                expectedHours8,
                shortageHours,
                shortageHoursFormatted: formatHHMM(shortageHours * 60),
                allocatedSalary,
                absenteeismDeduction,
                shortageDeduction,
                manualDeductions,
                netPayout,
                calculationSource,
                remarks
            });
        });

        // 5. If JSON preview requested, return structured JSON payload
        if (format === 'json') {
            const totalCtc = employeeDataList.reduce((acc, e) => acc + e.allocatedSalary, 0);
            const totalAbsenteeism = employeeDataList.reduce((acc, e) => acc + e.absenteeismDeduction, 0);
            const totalShortage = employeeDataList.reduce((acc, e) => acc + e.shortageDeduction, 0);
            const totalOther = employeeDataList.reduce((acc, e) => acc + e.manualDeductions, 0);
            const totalNet = employeeDataList.reduce((acc, e) => acc + e.netPayout, 0);

            return res.json({
                cycle: {
                    month: m,
                    year: y,
                    monthName: fullMonthNames[m - 1],
                    label: cycleLabel,
                    totalDays: totalCycleDays,
                    sundays: sundaysCount,
                    calculationMode: globalCalculationMode
                },
                summary: {
                    employeeCount: employeeDataList.length,
                    totalCtc,
                    totalAbsenteeism,
                    totalShortage,
                    totalOther,
                    totalNet
                },
                employees: employeeDataList
            });
        }

        // 6. Generate Multi-Sheet Corporate Excel Workbook
        const workbook = new excelJS.Workbook();
        workbook.creator = 'PeopleDesk HRM System';
        workbook.lastModifiedBy = 'PeopleDesk Payroll Engine';
        workbook.created = new Date();

        const currentISTStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

        // ==========================================
        // SHEET 1: PAYROLL & SALARY SUMMARY
        // ==========================================
        const summarySheet = workbook.addWorksheet('Payroll & Salary Summary', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
        });

        // Title Header Block
        summarySheet.mergeCells('A1:Y1');
        const titleCell = summarySheet.getCell('A1');
        titleCell.value = 'PEOPLEDESK HRM — MONTHLY PAYROLL & SALARY REPORT';
        titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Navy Slate
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        summarySheet.getRow(1).height = 36;

        // Subtitle Info Block
        summarySheet.mergeCells('A2:Y2');
        const subCell = summarySheet.getCell('A2');
        subCell.value = `Cycle Period: ${cycleLabel}   |   Total Cycle Days: ${totalCycleDays} Days (Sundays: ${sundaysCount})   |   Generated: ${currentISTStr} IST`;
        subCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Slate 100
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        summarySheet.getRow(2).height = 24;

        // Row 3: Spacer
        summarySheet.getRow(3).height = 10;

        // Table Columns Configuration
        summarySheet.columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'Emp ID', key: 'id', width: 10 },
            { header: 'Employee Name', key: 'name', width: 24 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Designation', key: 'designation', width: 16 },
            { header: 'Role', key: 'role', width: 16 },
            { header: 'Cycle Days', key: 'totalCycleDays', width: 12 },
            { header: 'Present (PD)', key: 'workingDaysPD', width: 13 },
            { header: 'Present (Bio)', key: 'workingDaysBio', width: 13 },
            { header: 'Effective Days', key: 'effectivePresentDays', width: 14 },
            { header: 'Full Leaves', key: 'approvedLeavesFull', width: 12 },
            { header: 'Half Leaves', key: 'approvedLeavesHalf', width: 12 },
            { header: 'Permissions', key: 'approvedPermissions', width: 12 },
            { header: 'LOP Days', key: 'lopDays', width: 11 },
            { header: 'Actual Hours', key: 'actualHoursFormatted', width: 14 },
            { header: 'Expected Hours', key: 'expectedShiftHoursFormatted', width: 15 },
            { header: 'Shortage Hours', key: 'shortageHoursFormatted', width: 15 },
            { header: 'Monthly CTC (₹)', key: 'allocatedSalary', width: 18 },
            { header: 'Absenteeism (₹)', key: 'absenteeismDeduction', width: 16 },
            { header: 'Shortage Ded (₹)', key: 'shortageDeduction', width: 16 },
            { header: 'Other Ded (₹)', key: 'manualDeductions', width: 15 },
            { header: 'Net Payout (₹)', key: 'netPayout', width: 20 },
            { header: 'Source', key: 'calculationSource', width: 12 },
            { header: 'Remarks / Notes', key: 'remarks', width: 30 }
        ];

        // Format Header Row (Row 4)
        const headerRow = summarySheet.getRow(4);
        headerRow.height = 32;
        headerRow.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } }; // Indigo 900
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF475569' } },
                bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
                left: { style: 'thin', color: { argb: 'FF475569' } },
                right: { style: 'thin', color: { argb: 'FF475569' } }
            };
        });

        // Add Data Rows
        employeeDataList.forEach((emp, index) => {
            const row = summarySheet.addRow({
                sno: emp.sno,
                id: emp.id,
                name: emp.name,
                email: emp.email,
                phone: emp.phone,
                designation: emp.designation,
                role: emp.role,
                totalCycleDays: emp.totalCycleDays,
                workingDaysPD: emp.workingDaysPD,
                workingDaysBio: emp.workingDaysBio,
                effectivePresentDays: emp.effectivePresentDays,
                approvedLeavesFull: emp.approvedLeavesFull,
                approvedLeavesHalf: emp.approvedLeavesHalf,
                approvedPermissions: emp.approvedPermissions,
                lopDays: emp.lopDays,
                actualHoursFormatted: emp.actualHoursFormatted,
                expectedShiftHoursFormatted: emp.expectedShiftHoursFormatted,
                shortageHoursFormatted: emp.shortageHoursFormatted,
                allocatedSalary: emp.allocatedSalary,
                absenteeismDeduction: emp.absenteeismDeduction,
                shortageDeduction: emp.shortageDeduction,
                manualDeductions: emp.manualDeductions,
                netPayout: emp.netPayout,
                calculationSource: emp.calculationSource,
                remarks: emp.remarks
            });

            row.height = 24;
            const isEven = index % 2 === 0;
            const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Clean zebra striping

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.font = { name: 'Segoe UI', size: 9.5 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };

                // Alignments & Number Formats
                // S.No, ID, Cycle Days, Present Days, Leaves, Permissions, LOP
                if ([1, 2, 8, 9, 10, 11, 12, 13, 14, 15].includes(colNumber)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.numFmt = '#,##0';
                } else if ([16, 17, 18].includes(colNumber)) {
                    // Working Hours (HH:MM)
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else if ([19, 20, 21, 22].includes(colNumber)) {
                    // Currency values
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    cell.numFmt = '₹#,##0';
                } else if (colNumber === 23) {
                    // Net Payout - Emphasize with soft emerald highlight and bold font
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF065F46' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
                    cell.numFmt = '₹#,##0';
                } else if (colNumber === 24) {
                    // Source
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.font = { name: 'Segoe UI', size: 9, bold: true };
                } else {
                    // Text details
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });
        });

        // Add Summary / Totals Row
        const totalCtc = employeeDataList.reduce((acc, e) => acc + e.allocatedSalary, 0);
        const totalAbsenteeism = employeeDataList.reduce((acc, e) => acc + e.absenteeismDeduction, 0);
        const totalShortage = employeeDataList.reduce((acc, e) => acc + e.shortageDeduction, 0);
        const totalOther = employeeDataList.reduce((acc, e) => acc + e.manualDeductions, 0);
        const totalNet = employeeDataList.reduce((acc, e) => acc + e.netPayout, 0);
        const totalPresent = employeeDataList.reduce((acc, e) => acc + e.effectivePresentDays, 0);
        const totalLop = employeeDataList.reduce((acc, e) => acc + e.lopDays, 0);

        const totalsRow = summarySheet.addRow({
            sno: '',
            id: '',
            name: `TOTAL (${employeeDataList.length} STAFF)`,
            email: '',
            phone: '',
            designation: '',
            role: '',
            totalCycleDays: '',
            workingDaysPD: '',
            workingDaysBio: '',
            effectivePresentDays: totalPresent,
            approvedLeavesFull: '',
            approvedLeavesHalf: '',
            approvedPermissions: '',
            lopDays: totalLop,
            actualHoursFormatted: '',
            expectedShiftHoursFormatted: '',
            shortageHoursFormatted: '',
            allocatedSalary: totalCtc,
            absenteeismDeduction: totalAbsenteeism,
            shortageDeduction: totalShortage,
            manualDeductions: totalOther,
            netPayout: totalNet,
            calculationSource: '',
            remarks: ''
        });

        totalsRow.height = 30;
        totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: 'Segoe UI', size: 10, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }; // Indigo 50
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF312E81' } },
                bottom: { style: 'double', color: { argb: 'FF1E293B' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };

            if ([11, 15].includes(colNumber)) {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.numFmt = '#,##0';
            } else if ([19, 20, 21, 22].includes(colNumber)) {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                cell.numFmt = '₹#,##0';
            } else if (colNumber === 23) {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF065F46' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                cell.numFmt = '₹#,##0';
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
            }
        });

        // ==========================================
        // SHEET 2: ATTENDANCE & HOURS AUDIT
        // ==========================================
        const auditSheet = workbook.addWorksheet('Attendance & Hours Audit', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 2 }]
        });

        // Title Header
        auditSheet.mergeCells('A1:R1');
        const auditTitle = auditSheet.getCell('A1');
        auditTitle.value = `ATTENDANCE, BIOMETRIC & TIME AUDIT LOG (${cycleLabel})`;
        auditTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        auditTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        auditTitle.alignment = { vertical: 'middle', horizontal: 'center' };
        auditSheet.getRow(1).height = 32;

        auditSheet.columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'Employee Name', key: 'name', width: 24 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Designation', key: 'designation', width: 16 },
            { header: 'Role', key: 'role', width: 14 },
            { header: 'Cycle Days', key: 'totalCycleDays', width: 12 },
            { header: 'Present (PD)', key: 'workingDaysPD', width: 13 },
            { header: 'Present (Bio)', key: 'workingDaysBio', width: 13 },
            { header: 'Effective Days', key: 'effectivePresentDays', width: 14 },
            { header: 'Full Leaves (Appr)', key: 'approvedLeavesFull', width: 16 },
            { header: 'Full Leaves (Pend)', key: 'pendingLeavesFull', width: 16 },
            { header: 'Half Leaves (Appr)', key: 'approvedLeavesHalf', width: 16 },
            { header: 'Half Leaves (Pend)', key: 'pendingLeavesHalf', width: 16 },
            { header: 'Perms (Appr)', key: 'approvedPermissions', width: 13 },
            { header: 'Perms (Pend)', key: 'pendingPermissions', width: 13 },
            { header: 'Perm Hours Credit', key: 'permissionCreditHours', width: 16 },
            { header: 'Actual Hours (HH:MM)', key: 'actualHoursFormatted', width: 18 },
            { header: 'Shortage Hours', key: 'shortageHoursFormatted', width: 15 }
        ];

        const auditHeaderRow = auditSheet.getRow(2);
        auditHeaderRow.height = 28;
        auditHeaderRow.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
        auditHeaderRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        auditHeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF334155' } },
                bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
                left: { style: 'thin', color: { argb: 'FF334155' } },
                right: { style: 'thin', color: { argb: 'FF334155' } }
            };
        });

        employeeDataList.forEach((emp, idx) => {
            const row = auditSheet.addRow({
                sno: emp.sno,
                name: emp.name,
                email: emp.email,
                designation: emp.designation,
                role: emp.role,
                totalCycleDays: emp.totalCycleDays,
                workingDaysPD: emp.workingDaysPD,
                workingDaysBio: emp.workingDaysBio,
                effectivePresentDays: emp.effectivePresentDays,
                approvedLeavesFull: emp.approvedLeavesFull,
                pendingLeavesFull: emp.pendingLeavesFull,
                approvedLeavesHalf: emp.approvedLeavesHalf,
                pendingLeavesHalf: emp.pendingLeavesHalf,
                approvedPermissions: emp.approvedPermissions,
                pendingPermissions: emp.pendingPermissions,
                permissionCreditHours: `${emp.permissionCreditHours} hrs`,
                actualHoursFormatted: emp.actualHoursFormatted,
                shortageHoursFormatted: emp.shortageHoursFormatted
            });

            row.height = 22;
            const isEven = idx % 2 === 0;
            const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.font = { name: 'Segoe UI', size: 9 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };

                if ([1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(colNumber)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });
        });

        // 7. Stream Excel attachment response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=PAYROLL_SALARY_${prevMonthName}26_to_${curMonthName}25_${y}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Payroll Report Generation Error:', error);
        res.status(500).json({ message: 'Failed to generate payroll report', error: error.message });
    }
};

// @desc    Import Manual Payroll Excel or CSV
// @route   POST /api/payroll/import-manual
// @access  Private (Admin)
const importManualPayroll = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Excel or CSV file is required' });
        }

        const { month, year } = req.body;
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        const m = parseInt(month, 10);
        const y = parseInt(year, 10);

        const workbook = new excelJS.Workbook();
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

        if (fileExtension === 'csv') {
            await workbook.csv.readFile(req.file.path);
        } else if (['xlsx', 'xls'].includes(fileExtension)) {
            await workbook.xlsx.readFile(req.file.path);
        } else {
            return res.status(400).json({ message: 'Unsupported file format. Please upload .xlsx or .csv' });
        }

        const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
        if (!worksheet) {
            return res.status(400).json({ message: 'No worksheet found in file' });
        }

        // Get all active employee emails for validation
        const validUsers = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: { email: true }
        });
        const validEmailSet = new Set(validUsers.map(u => u.email.toLowerCase()));

        const payrollData = [];
        const failedEmails = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const getVal = (idx) => {
                const cell = row.getCell(idx);
                if (cell.value && typeof cell.value === 'object' && 'result' in cell.value) {
                    return cell.value.result;
                }
                return cell.value;
            };

            const rawEmail = getVal(1)?.toString().trim();
            if (!rawEmail) return;
            const email = rawEmail.toLowerCase();

            // Validate email exists in system
            if (!validEmailSet.has(email)) {
                failedEmails.push(rawEmail);
                return;
            }

            const allocatedSalary = cleanNumber(getVal(2));
            const absenteeismDeduction = cleanNumber(getVal(3));
            const shortageDeduction = cleanNumber(getVal(4));
            const manualDeductions = cleanNumber(getVal(5));
            const netPayout = cleanNumber(getVal(6));
            const remarks = getVal(7)?.toString().trim() || null;

            payrollData.push({
                email,
                month: m,
                year: y,
                allocatedSalary,
                absenteeismDeduction,
                shortageDeduction,
                manualDeductions,
                netPayout,
                remarks
            });
        });

        if (payrollData.length === 0 && failedEmails.length === 0) {
            return res.status(400).json({ message: 'No payroll data rows found in file.' });
        }

        // Upsert records into database (with fallback if remarks column not yet in DB table)
        for (const data of payrollData) {
            try {
                await prisma.manualPayroll.upsert({
                    where: {
                        email_month_year: {
                            email: data.email,
                            month: data.month,
                            year: data.year
                        }
                    },
                    update: data,
                    create: data
                });
            } catch (upsertErr) {
                // If remarks column causes issue before migration on server, fallback without remarks
                if (upsertErr.message && upsertErr.message.includes('remarks')) {
                    const { remarks: _rem, ...dataWithoutRemarks } = data;
                    await prisma.manualPayroll.upsert({
                        where: {
                            email_month_year: {
                                email: data.email,
                                month: data.month,
                                year: data.year
                            }
                        },
                        update: dataWithoutRemarks,
                        create: dataWithoutRemarks
                    });
                } else {
                    throw upsertErr;
                }
            }
        }

        // Clean up the uploaded file from temp storage
        try {
            const fs = require('fs');
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (err) {
            console.error('File cleanup error:', err);
        }

        res.json({ 
            message: `Successfully processed ${payrollData.length} payroll records for ${m}/${y}.`,
            successCount: payrollData.length,
            failedCount: failedEmails.length,
            failedEmails: failedEmails
        });
    } catch (error) {
        console.error('Manual Payroll Import Error:', error);
        res.status(500).json({
            message: 'Internal Server Error during import',
            error: error.message
        });
    }
};

module.exports = { generatePayrollReport, importManualPayroll };
