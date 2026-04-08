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

        // Cycle: 26th of (m-1) to 25th of m
        const startDate = new Date(y, m - 2, 26, 0, 0, 0);
        const endDate = new Date(y, m - 1, 25, 23, 59, 59);
        const targetYear = y;

        let userWhere = { status: 'ACTIVE', role: 'EMPLOYEE' };
        if (req.user.role === 'AE_MANAGER') {
            userWhere.designation = 'AE';
        }

        // 1. Fetch all relevant users
        const users = await prisma.user.findMany({
            where: userWhere,
            select: { id: true, name: true, email: true, designation: true }
        });

        const userIds = users.map(u => u.id);

        // 2. Bulk fetch all data for the group
        const [allAttendance, allBioLogs, allLeaves, allPermissions] = await Promise.all([
            prisma.attendance.findMany({
                where: { userId: { in: userIds }, date: { gte: startDate, lte: endDate } },
                include: { breaks: true }
            }),
            prisma.biometricLog.findMany({
                where: { userId: { in: userIds }, punchTime: { gte: new Date(y - 1, 0, 1), lte: new Date(y + 1, 11, 31) } }
            }),
            prisma.leaveRequest.findMany({
                where: { userId: { in: userIds }, startDate: { lte: endDate }, endDate: { gte: startDate } }
            }),
            prisma.permissionRequest.findMany({
                where: { userId: { in: userIds }, date: { gte: startDate, lte: endDate } }
            })
        ]);

        // Helper: Format minutes into HH:MM
        const formatHHMM = (totalMinutes) => {
            if (!totalMinutes || totalMinutes <= 0) return "00:00";
            const h = Math.floor(totalMinutes / 60);
            const m = Math.round(totalMinutes % 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        // 3. Prepare Aggregation Maps
        const attendanceMap = new Map();
        const bioMap = new Map();
        const leaveHalfMap = new Map();
        const leaveFullMap = new Map();
        const permissionMap = new Map();
        const actualMinsMap = new Map();

        userIds.forEach(id => {
            attendanceMap.set(id, new Set());
            bioMap.set(id, new Set());
            leaveHalfMap.set(id, 0);
            leaveFullMap.set(id, 0);
            permissionMap.set(id, 0);
            actualMinsMap.set(id, 0);
        });

        // Populate Maps
        allAttendance.forEach(a => {
            const dateStr = new Date(a.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
            attendanceMap.get(a.userId)?.add(dateStr);
            
            // Calculate Net Work Minutes for this session
            if (a.checkoutTime) {
                const clockIn = new Date(a.date);
                const clockOut = new Date(a.checkoutTime);
                const grossMinutes = (clockOut - clockIn) / (1000 * 60);
                
                let breakMinutes = 0;
                if (a.breaks) {
                    a.breaks.forEach(b => {
                        if (['TEA', 'LUNCH'].includes(b.breakType)) {
                            breakMinutes += (b.duration || 0);
                        }
                    });
                }
                const netMinutes = Math.max(0, grossMinutes - breakMinutes);
                actualMinsMap.set(a.userId, (actualMinsMap.get(a.userId) || 0) + netMinutes);
            }
        });
        
        allBioLogs.forEach(log => {
            const norm = normalizeBiometricDate(log.punchTime, targetYear);
            if (norm >= startDate && norm <= endDate) {
                const dateStr = norm.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
                bioMap.get(log.userId)?.add(dateStr);
            }
        });

        allPermissions.forEach(p => permissionMap.set(p.userId, (permissionMap.get(p.userId) || 0) + 1));
        
        allLeaves.forEach(l => {
            if (l.type === 'HALF_DAY') {
                leaveHalfMap.set(l.userId, (leaveHalfMap.get(l.userId) || 0) + 1);
            } else {
                leaveFullMap.set(l.userId, (leaveFullMap.get(l.userId) || 0) + 1);
            }
        });

        // 4. Generate Excel
        const workbook = new excelJS.Workbook();
        const sheet = workbook.addWorksheet('Payroll Summary');

        sheet.columns = [
            { header: 'Employee Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Working Days (PD)', key: 'workingDaysPD', width: 18 },
            { header: 'Working Days (Biometric)', key: 'workingDaysBio', width: 18 },
            { header: 'Actual Working Hours', key: 'actualHours', width: 22 },
            { header: 'Expected Working Hours (PD)', key: 'expectedHours', width: 25 },
            { header: 'Total Permissions', key: 'permissions', width: 18 },
            { header: 'Total Half Day Leaves', key: 'leavesHalf', width: 18 },
            { header: 'Total Full Day Leaves', key: 'leavesFull', width: 18 }
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        users.forEach(user => {
            const presentDays = attendanceMap.get(user.id)?.size || 0;
            const expectedMinutes = presentDays * 520; // 8h 40m = 520 mins
            
            sheet.addRow({
                name: user.name,
                email: user.email,
                workingDaysPD: presentDays,
                workingDaysBio: bioMap.get(user.id)?.size || 0,
                actualHours: formatHHMM(actualMinsMap.get(user.id)),
                expectedHours: formatHHMM(expectedMinutes),
                permissions: permissionMap.get(user.id) || 0,
                leavesHalf: leaveHalfMap.get(user.id) || 0,
                leavesFull: leaveFullMap.get(user.id) || 0
            });
        });

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

        const cleanNumber = (val) => {
            if (val === undefined || val === null || val === '') return 0;
            if (typeof val === 'number') return val;
            // Remove currency symbols, commas, and other non-numeric chars (except decimal)
            const cleaned = val.toString().replace(/[^\d.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        };

        const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
        if (!worksheet) {
            return res.status(400).json({ message: 'No worksheet found in file' });
        }

        // Get all valid employee emails first for validation
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
                month: parseInt(month),
                year: parseInt(year),
                allocatedSalary,
                absenteeismDeduction,
                shortageDeduction,
                manualDeductions,
                netPayout,
                remarks
            });
        });

        if (payrollData.length === 0 && failedEmails.length === 0) {
            return res.status(400).json({ message: 'No payroll data found in file.' });
        }

        // Upsert logic
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

        res.json({ 
            message: `Successfully processed ${payrollData.length} records for ${month}/${year}.`,
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
