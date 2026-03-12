const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to check for COO/AM/Admin roles
const isAuthorized = (user) => {
    if (user.role === 'ADMIN' || user.role === 'ACCOUNTS_MANAGER') return true;
    if (user.role === 'BUSINESS_HEAD' && (user.designation === 'COO' || user.designation === 'Chief Operational Officer')) return true;
    return false;
};

// @desc    Get all carpenter records
// @route   GET /api/carpenter
// @access  Private (Admin, COO, AM)
const getCarpenterRecords = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    try {
        const records = await prisma.carpenterRecord.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(records);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new carpenter record
// @route   POST /api/carpenter
// @access  Private (Admin, COO, AM)
const createCarpenterRecord = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    try {
        const { aeName, clientName, siteName, carpenterName, workOrderValue, cookscapeRate, advance, remarks, status } = req.body;
        
        const woValue = parseFloat(workOrderValue) || 0;
        const csRate = parseFloat(cookscapeRate) || 0;
        const adv = parseFloat(advance) || 0;
        
        // Auto-calculations
        const leoSirRate = woValue * 0.10;
        const balance = csRate - adv;

        const record = await prisma.carpenterRecord.create({
            data: {
                aeName,
                clientName,
                siteName,
                carpenterName,
                workOrderValue: woValue,
                leoSirRate,
                cookscapeRate: csRate,
                advance: adv,
                balance,
                remarks,
                status
            }
        });
        res.status(201).json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a carpenter record
// @route   PUT /api/carpenter/:id
// @access  Private (Admin, COO, AM)
const updateCarpenterRecord = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    try {
        const { id } = req.params;
        const { aeName, clientName, siteName, carpenterName, workOrderValue, cookscapeRate, advance, remarks, status } = req.body;
        
        const woValue = parseFloat(workOrderValue) || 0;
        const csRate = parseFloat(cookscapeRate) || 0;
        const adv = parseFloat(advance) || 0;
        
        // Auto-calculations
        const leoSirRate = woValue * 0.10;
        const balance = csRate - adv;

        const record = await prisma.carpenterRecord.update({
            where: { id: parseInt(id) },
            data: {
                aeName,
                clientName,
                siteName,
                carpenterName,
                workOrderValue: woValue,
                leoSirRate,
                cookscapeRate: csRate,
                advance: adv,
                balance,
                remarks,
                status
            }
        });
        res.json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a carpenter record
// @route   DELETE /api/carpenter/:id
// @access  Private (Admin, COO, AM)
const deleteCarpenterRecord = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    try {
        const { id } = req.params;
        await prisma.carpenterRecord.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const ExcelJS = require('exceljs');

// @desc    Export carpenter records to Excel
// @route   GET /api/carpenter/export
// @access  Private (Admin, COO, AM)
const exportCarpenterRecords = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    try {
        const records = await prisma.carpenterRecord.findMany({
            orderBy: { createdAt: 'desc' }
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Carpenter Records');

        worksheet.columns = [
            { header: 'AE NAME', key: 'aeName', width: 15 },
            { header: 'CLIENT NAME', key: 'clientName', width: 25 },
            { header: 'SITE NAME', key: 'siteName', width: 25 },
            { header: 'CARPENTER NAME', key: 'carpenterName', width: 25 },
            { header: 'WORK ORDER VALUE', key: 'workOrderValue', width: 20 },
            { header: 'LEO SIR RATE (10%)', key: 'leoSirRate', width: 20 },
            { header: 'COOKSCAPE RATE', key: 'cookscapeRate', width: 20 },
            { header: 'ADVANCE', key: 'advance', width: 15 },
            { header: 'BALANCE', key: 'balance', width: 15 },
            { header: 'STATUS', key: 'status', width: 20 },
            { header: 'REMARKS', key: 'remarks', width: 30 },
            { header: 'CREATED AT', key: 'createdAt', width: 20 }
        ];

        records.forEach(record => {
            worksheet.addRow(record);
        });

        // Styling the header
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=CarpenterRecords.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getCarpenterRecords,
    createCarpenterRecord,
    updateCarpenterRecord,
    deleteCarpenterRecord,
    exportCarpenterRecords
};
