const ExcelJS = require('exceljs');
const path = require('path');

const generateExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Manual Payroll');

    sheet.columns = [
        { header: 'Email (Required)', key: 'email', width: 30 },
        { header: 'Monthly CTC', key: 'ctc', width: 20 },
        { header: 'Absenteeism Deduction', key: 'absent', width: 20 },
        { header: 'Shortage Deduction', key: 'shortage', width: 20 },
        { header: 'Other Deductions', key: 'other', width: 20 },
        { header: 'Final Net Payout', key: 'payout', width: 20 },
        { header: 'Deduction Remarks/Notes', key: 'remarks', width: 50 }
    ];

    // Add sample rows
    sheet.addRows([
        ['employee@yourcompany.com', 50000, 0, 0, 500, 49500, 'Adjustment for travel allowance'],
        ['admin@yourcompany.com', 75000, 1500, 200, 0, 73300, 'Late attendance penalty'],
        ['manager@yourcompany.com', 65000, 0, 150, 0, 64850, 'Shortage adjustment'],
        ['finance@yourcompany.com', 55000, 2000, 0, 100, 52900, 'LOP for leave without prior notice']
    ]);

    // Style the header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600

    const filePath = path.join(__dirname, 'PeopleDesk_Manual_Payroll.xlsx');
    await workbook.xlsx.writeFile(filePath);
    console.log('Excel file created at:', filePath);
};

generateExcel().catch(err => {
    console.error('Error generating Excel:', err);
    process.exit(1);
});
