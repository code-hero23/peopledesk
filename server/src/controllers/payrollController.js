const prisma = require('../config/prisma');
const excelJS = require('exceljs');
const { getCycleStartDateIST, getCycleEndDateIST } = require('../utils/dateHelpers');

// Helper: Clean non-numeric characters for currency/number parsing
const cleanNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = val.toString().replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

// @desc    Generate Payroll Report
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

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const prevMonthName = monthNames[prevM];
        const curMonthName = monthNames[m - 1];
        const cycleLabel = `26 ${prevMonthName} ${prevY} to 25 ${curMonthName} ${y}`;

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
                designation: true,
                role: true
            },
            orderBy: { name: 'asc' }
        });

        const userIds = users.map(u => u.id);

        // 2. Fetch cycle attendance, leaves, and permissions in parallel
        const [allAttendance, allLeaves, allPermissions] = await Promise.all([
            prisma.attendance.findMany({
                where: { userId: { in: userIds }, date: { gte: startDate, lte: endDate } }
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
            })
        ]);

        // 3. Prepare Aggregation Maps
        const attendanceMap = new Map();
        const leaveHalfMap = new Map();
        const leaveFullMap = new Map();
        const permissionMap = new Map();

        userIds.forEach(id => {
            attendanceMap.set(id, new Set());
            leaveHalfMap.set(id, 0);
            leaveFullMap.set(id, 0);
            permissionMap.set(id, 0);
        });

        // Unique calendar dates (IST) where employee checked in
        allAttendance.forEach(a => {
            const dateStr = new Date(a.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            attendanceMap.get(a.userId)?.add(dateStr);
        });

        // Applied permissions count
        allPermissions.forEach(p => {
            permissionMap.set(p.userId, (permissionMap.get(p.userId) || 0) + 1);
        });

        // Applied leaves: overlap days within cycle
        allLeaves.forEach(l => {
            const startOverlap = new Date(Math.max(new Date(l.startDate).setHours(0, 0, 0, 0), startDate.getTime()));
            const endOverlap = new Date(Math.min(new Date(l.endDate).setHours(23, 59, 59, 999), endDate.getTime()));
            if (startOverlap <= endOverlap) {
                const days = Math.max(1, Math.ceil((endOverlap - startOverlap) / (1000 * 60 * 60 * 24)));
                if (l.type === 'HALF_DAY') {
                    leaveHalfMap.set(l.userId, (leaveHalfMap.get(l.userId) || 0) + days);
                } else {
                    leaveFullMap.set(l.userId, (leaveFullMap.get(l.userId) || 0) + days);
                }
            }
        });

        // 4. Build records list with the exact 6 columns requested
        const records = users.map(user => {
            const presentDaysRaw = attendanceMap.get(user.id)?.size || 0;
            const leavesHalf = leaveHalfMap.get(user.id) || 0;
            const leavesFullApplied = leaveFullMap.get(user.id) || 0;
            const totalPermissions = permissionMap.get(user.id) || 0;

            // Deduct 0.5 days for each applied half-day leave
            const workingDaysPD = Math.max(0, presentDaysRaw - (leavesHalf * 0.5));

            return {
                name: user.name,
                email: user.email,
                workingDaysPD: Number.isInteger(workingDaysPD) ? workingDaysPD : parseFloat(workingDaysPD.toFixed(1)),
                totalPermissions,
                totalHalfDayLeaves: leavesHalf,
                totalFullDayLeavesApplied: leavesFullApplied
            };
        });

        // 5. JSON preview format
        if (format === 'json') {
            return res.json({
                cycle: {
                    month: m,
                    year: y,
                    label: cycleLabel
                },
                totalEmployees: records.length,
                records
            });
        }

        // 6. Generate Excel with the exact 6 columns requested
        const workbook = new excelJS.Workbook();
        workbook.creator = 'PeopleDesk HRM';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Payroll Summary', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        sheet.columns = [
            { header: 'Employee Name', key: 'name', width: 26 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Working Days (PD)', key: 'workingDaysPD', width: 20 },
            { header: 'Total Permissions', key: 'totalPermissions', width: 18 },
            { header: 'Total Half Day Leaves', key: 'totalHalfDayLeaves', width: 22 },
            { header: 'Total Full Day Leaves (applied)', key: 'totalFullDayLeavesApplied', width: 30 }
        ];

        // Header row styling matching standard Excel reports
        const headerRow = sheet.getRow(1);
        headerRow.height = 28;
        headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.eachCell((cell, colNumber) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
                bottom: { style: 'medium', color: { argb: 'FF808080' } },
                left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
                right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
            };
            if (colNumber <= 2) {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
            }
        });

        // Add Data Rows
        records.forEach((rec, idx) => {
            const row = sheet.addRow({
                name: rec.name,
                email: rec.email,
                workingDaysPD: rec.workingDaysPD,
                totalPermissions: rec.totalPermissions,
                totalHalfDayLeaves: rec.totalHalfDayLeaves,
                totalFullDayLeavesApplied: rec.totalFullDayLeavesApplied
            });

            row.height = 22;
            const isEven = idx % 2 === 0;
            const rowBg = isEven ? 'FFFFFFFF' : 'FFF9FAFB';

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.font = { name: 'Calibri', size: 10 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };

                if (colNumber <= 2) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.numFmt = colNumber === 3 ? '0.#' : '0';
                }
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=PAYROLL_REPORT_${prevMonthName}26_to_${curMonthName}25_${y}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Payroll Report Error:', error);
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
