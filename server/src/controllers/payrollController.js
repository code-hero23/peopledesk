const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const excelJS = require('exceljs');
const { normalizeBiometricDate } = require('../utils/dateHelpers');

// @desc    Generate Payroll Report
// @route   GET /api/payroll/report
// @access  Private (Admin, HR, BH)
const generatePayrollReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        const m = parseInt(month);
        const y = parseInt(year);

        const startDate = new Date(y, m - 2, 26, 0, 0, 0);
        const endDate = new Date(y, m - 1, 25, 23, 59, 59);
        const targetYear = y;

        let userWhere = { status: 'ACTIVE', role: 'EMPLOYEE' };
        if (req.user.role === 'AE_MANAGER') {
            userWhere.designation = 'AE';
        }

        const users = await prisma.user.findMany({
            where: userWhere,
            select: { id: true, name: true, email: true, designation: true, allocatedSalary: true }
        });

        const workbook = new excelJS.Workbook();
        const sheet = workbook.addWorksheet('Payroll Summary');

        sheet.columns = [
            { header: 'Employee Name', key: 'name', width: 25 },
            { header: 'Mail ID', key: 'email', width: 25 },
            { header: 'Working Days (PD)', key: 'workingDaysPD', width: 18 },
            { header: 'Working Days (Bio)', key: 'workingDaysBio', width: 18 },
            { header: 'Absent Days (PD)', key: 'absentDaysPD', width: 18 },
            { header: 'Absent Days (Bio)', key: 'absentDaysBio', width: 18 },
            { header: 'No of Permission', key: 'permissions', width: 18 },
            { header: 'Total Permission', key: 'totalPermissions', width: 18 },
            { header: 'No of Leaves (Full)', key: 'leavesFull', width: 18 },
            { header: 'Total Leaves (Full)', key: 'totalLeavesFull', width: 18 },
            { header: 'No of Leaves (Half)', key: 'leavesHalf', width: 18 },
            { header: 'Total Leaves (Half)', key: 'totalLeavesHalf', width: 18 },
            { header: 'Efficiency Score (%)', key: 'efficiency', width: 18 }
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        const totalDaysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        for (const user of users) {
            const [attendance, biometricLogs, leaves, permissions] = await Promise.all([
                prisma.attendance.findMany({
                    where: { userId: user.id, date: { gte: startDate, lte: endDate } },
                    include: { breaks: true }
                }),
                prisma.biometricLog.findMany({
                    where: { userId: user.id, punchTime: { gte: new Date(y - 1, 0, 1), lte: new Date(y + 1, 11, 31) } }
                }),
                prisma.leaveRequest.findMany({
                    where: { userId: user.id, startDate: { lte: endDate }, endDate: { gte: startDate } }
                }),
                prisma.permissionRequest.findMany({
                    where: { userId: user.id, date: { gte: startDate, lte: endDate } }
                })
            ]);

            // 1. PeopleDesk Days
            const workingDaysPD = attendance.length;
            const absentDaysPD = Math.max(0, totalDaysInPeriod - workingDaysPD);

            // 2. Biometric Days (Normalized)
            const bioDays = new Set();
            biometricLogs.forEach(log => {
                const norm = normalizeBiometricDate(log.punchTime, targetYear);
                if (norm >= startDate && norm <= endDate) {
                    bioDays.add(norm.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }));
                }
            });
            const workingDaysBio = bioDays.size;
            const absentDaysBio = Math.max(0, totalDaysInPeriod - workingDaysBio);

            // 3. Leaves & Permissions
            const leavesFullArr = leaves.filter(l => l.type !== 'HALF_DAY');
            const leavesHalfArr = leaves.filter(l => l.type === 'HALF_DAY');
            
            const fullAppr = leavesFullArr.filter(l => l.status === 'APPROVED').length;
            const fullPend = leavesFullArr.filter(l => l.status === 'PENDING').length;
            
            const halfAppr = leavesHalfArr.filter(l => l.status === 'APPROVED').length;
            const halfPend = leavesHalfArr.filter(l => l.status === 'PENDING').length;

            const permissionAppr = permissions.filter(p => p.status === 'APPROVED').length;
            const permissionPend = permissions.filter(p => p.status === 'PENDING').length;

            // 4. Efficiency Score
            let totalNetMinutes = 0;
            attendance.forEach(record => {
                if (record.checkoutTime && record.date) {
                    const gross = (new Date(record.checkoutTime) - new Date(record.date)) / (1000 * 60);
                    let breakMins = 0;
                    record.breaks.forEach(b => {
                        if (['TEA', 'LUNCH'].includes(b.breakType)) breakMins += (b.duration || 0);
                    });
                    totalNetMinutes += Math.max(0, gross - breakMins);
                }
            });
            const expectedMinutes = workingDaysPD * 520; // 8h 40m = 520 mins
            const efficiency = expectedMinutes > 0 ? Math.round((totalNetMinutes / expectedMinutes) * 100) : 0;

            sheet.addRow({
                name: user.name,
                email: user.email,
                workingDaysPD,
                workingDaysBio,
                absentDaysPD,
                absentDaysBio,
                permissions: `Appr: ${permissionAppr} | Pend: ${permissionPend}`,
                totalPermissions: permissionAppr + permissionPend,
                leavesFull: `Appr: ${fullAppr} | Pend: ${fullPend}`,
                totalLeavesFull: fullAppr + fullPend,
                leavesHalf: `Appr: ${halfAppr} | Pend: ${halfPend}`,
                totalLeavesHalf: halfAppr + halfPend,
                efficiency: `${efficiency}%`
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Payroll_Summary_${month}_${year}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Payroll Report Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Import Manual Payroll Excel
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

        const payrollData = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            // Standardize cell access (CSV rows might be simple arrays vs XLSX cell objects)
            const getVal = (idx) => {
                const cell = row.getCell(idx);
                // For CSV, value might be direct, for XLSX it might be { result, formula } or simple value
                if (cell.value && typeof cell.value === 'object' && 'result' in cell.value) {
                    return cell.value.result;
                }
                return cell.value;
            };

            const email = getVal(1)?.toString().trim();
            const allocatedSalary = parseFloat(getVal(2)) || 0;
            const absenteeismDeduction = parseFloat(getVal(3)) || 0;
            const shortageDeduction = parseFloat(getVal(4)) || 0;
            const manualDeductions = parseFloat(getVal(5)) || 0;
            const netPayout = parseFloat(getVal(6)) || 0;

            if (email && email.includes('@')) {
                payrollData.push({
                    email,
                    month: parseInt(month),
                    year: parseInt(year),
                    allocatedSalary,
                    absenteeismDeduction,
                    shortageDeduction,
                    manualDeductions,
                    netPayout
                });
            }
        });

        if (payrollData.length === 0) {
            return res.status(400).json({ message: 'No valid payroll data found in Excel/CSV. Ensure the email column is correct.' });
        }

        // Upsert data to ManualPayroll model
        // We do this in a loop, but for large files a transaction or createMany (if supported by upsert logic) would be better.
        // Prisma doesn't have upsertMany, so we loop or delete/createMany.
        for (const data of payrollData) {
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
        }

        // Clean up the uploaded file
        try {
            const fs = require('fs');
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (err) {
            console.error('File cleanup error:', err);
        }

        res.json({ message: `Successfully imported ${payrollData.length} records for ${month}/${year}` });
    } catch (error) {
        console.error('Manual Payroll Import Error:', error);
        res.status(500).json({
            message: 'Internal Server Error during import',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = { generatePayrollReport, importManualPayroll };
