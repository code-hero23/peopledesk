const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const excelJS = require('exceljs');

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

        let userWhere = { status: 'ACTIVE', role: 'EMPLOYEE' };
        if (req.user.role === 'AE_MANAGER') {
            userWhere.designation = 'AE';
        }

        const users = await prisma.user.findMany({
            where: userWhere,
            select: { id: true, name: true, email: true, designation: true, allocatedSalary: true }
        });

        const workbook = new excelJS.Workbook();
        const sheet = workbook.addWorksheet('Payroll Report');

        // Column definitions (Keys mapped to specific indices for formula reference)
        sheet.columns = [
            { header: 'Employee Name', key: 'name', width: 25 },             // A
            { header: 'Email', key: 'email', width: 25 },                    // B
            { header: 'Designation', key: 'designation', width: 15 },        // C
            { header: 'Present Days', key: 'presentDays', width: 12 },       // D
            { header: 'Absent Days', key: 'absentDays', width: 12 },         // E
            { header: 'Approved Leaves', key: 'leaves', width: 15 },         // F
            { header: 'Unapproved Leaves', key: 'unapprovedLeaves', width: 18 }, // G
            { header: 'Approved Permissions', key: 'permissions', width: 20 }, // H
            { header: 'Permission Hours', key: 'permHours', width: 18 },     // I
            { header: 'Working Hours', key: 'workingHours', width: 15 },     // J
            { header: 'Expected Hours', key: 'expectedHours', width: 15 },   // K
            { header: 'Time Shortage', key: 'shortage', width: 15 },         // L
            { header: 'Allocated Monthly Salary', key: 'allocatedSalary', width: 25 }, // M
            { header: 'Other Deduction', key: 'extraDeduction', width: 20 }, // N
            { header: 'On-Hand Salary', key: 'onHandSalary', width: 20 }     // O
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        for (const user of users) {
            const [attendance, leaves, permissions] = await Promise.all([
                prisma.attendance.findMany({
                    where: { userId: user.id, date: { gte: startDate, lte: endDate } },
                    include: { breaks: true }
                }),
                prisma.leaveRequest.findMany({
                    where: { userId: user.id, status: 'APPROVED', startDate: { lte: endDate }, endDate: { gte: startDate } }
                }),
                prisma.permissionRequest.findMany({
                    where: { userId: user.id, status: 'APPROVED', date: { gte: startDate, lte: endDate } }
                })
            ]);

            const presentDays = attendance.length;
            const totalDaysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const absentDays = Math.max(0, totalDaysInPeriod - presentDays);
            const approvedLeaves = leaves.length;
            const approvedPermissions = permissions.length;

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

            const workingHours = parseFloat((totalMinutes / 1440).toFixed(5)); // Fraction of a day
            const allocated = user.allocatedSalary || 0;

            const row = sheet.addRow({
                name: user.name,
                email: user.email,
                designation: user.designation || 'EMPLOYEE',
                presentDays,
                absentDays,
                leaves: approvedLeaves,
                unapprovedLeaves: 0,
                permissions: approvedPermissions,
                permHours: 0,
                workingHours,
                expectedHours: 0,
                shortage: 0,
                allocatedSalary: allocated,
                extraDeduction: 0,
                onHandSalary: 0
            });

            const r = row.number;

            // Formula Logic for Intermediate Columns (Dividing by 24/1440 to store as Excel Time)
            row.getCell('unapprovedLeaves').value = { formula: `MAX(0, E${r} - F${r})`, result: 0 };
            row.getCell('permHours').value = { formula: `(MIN(H${r}, 4) * 2) / 24`, result: 0 };
            row.getCell('expectedHours').value = { formula: `(D${r} * 9) / 24`, result: 0 };
            row.getCell('shortage').value = { formula: `MAX(0, K${r} - I${r} - J${r})`, result: 0 };

            // Formula Logic: Allocated - absenteeism - shortfall - other
            // Column M: Allocated, E: Absent, L: Shortage (Time), N: Other Ded
            // Formula for O: Convert shortage back to decimal hours (*24) for math
            row.getCell('onHandSalary').value = {
                formula: `MAX(0, M${r} - (MAX(0, E${r}-4) * (M${r}/30)) - (L${r} * 24 * (M${r}/270)) - N${r})`,
                result: 0
            };

            // Formatting
            row.getCell('onHandSalary').font = { bold: true };
            row.getCell('onHandSalary').numFmt = '#,##0';
            row.getCell('allocatedSalary').numFmt = '#,##0';
            row.getCell('extraDeduction').numFmt = '#,##0';

            // Time Formatting [h]:mm handles values over 24 hours correctly
            const timeFormat = '[h]:mm';
            row.getCell('shortage').numFmt = timeFormat;
            row.getCell('workingHours').numFmt = timeFormat;
            row.getCell('expectedHours').numFmt = timeFormat;
            row.getCell('permHours').numFmt = timeFormat;
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Payroll_Report_${month}_${year}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Payroll Report Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { generatePayrollReport };
