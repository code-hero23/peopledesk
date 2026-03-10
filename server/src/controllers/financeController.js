const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to check for COO designation if role is BUSINESS_HEAD
const isCOO = (user) => {
    if (user.role === 'ADMIN' || user.role === 'ACCOUNTS_MANAGER') return true;
    if (user.role === 'BUSINESS_HEAD' && (user.designation === 'COO' || user.designation === 'Chief Operational Officer')) return true;
    return false;
};

// @desc    Get Financial Summary
// @route   GET /api/finance/summary
// @access  Private (AM, COO, Admin)
const getFinanceSummary = async (req, res) => {
    if (!isCOO(req.user)) {
        return res.status(403).json({ message: 'Not authorized as COO' });
    }
    try {
        let finance = await prisma.finance.findFirst();
        
        if (!finance) {
            finance = await prisma.finance.create({
                data: { currentCash: 0, totalSpent: 0 }
            });
        }

        const completedAndWaitingVouchers = await prisma.voucher.aggregate({
            _sum: { amount: true },
            where: { status: { in: ['COMPLETED', 'WAITING'] } }
        });

        const pendingVouchers = await prisma.voucher.aggregate({
            _sum: { amount: true },
            where: { status: { in: ['PENDING', 'APPROVED'] } }
        });

        res.json({
            currentCash: finance.currentCash,
            spent: completedAndWaitingVouchers._sum.amount || 0,
            balance: finance.currentCash - (completedAndWaitingVouchers._sum.amount || 0),
            pending: pendingVouchers._sum.amount || 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update Cash (Admin/AM)
// @route   POST /api/finance/add-cash
// @access  Private (Admin, AM)
const addCash = async (req, res) => {
    if (!isCOO(req.user)) {
        return res.status(403).json({ message: 'Not authorized as COO' });
    }
    try {
        const { amount, source, reason } = req.body;
        const addedById = req.user.id;
        
        let finance = await prisma.finance.findFirst();
        
        if (finance) {
            finance = await prisma.finance.update({
                where: { id: finance.id },
                data: { currentCash: finance.currentCash + parseFloat(amount) }
            });
        } else {
            finance = await prisma.finance.create({
                data: { currentCash: parseFloat(amount), totalSpent: 0 }
            });
        }

        // Record the deposit
        await prisma.deposit.create({
            data: {
                amount: parseFloat(amount),
                source: source || 'Direct Deposit',
                reason: reason || null,
                addedById
            }
        });

        res.json(finance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get Deposit History
// @route   GET /api/finance/deposits
// @access  Private (AM, COO, Admin)
const getDepositHistory = async (req, res) => {
    if (!isCOO(req.user)) {
        return res.status(403).json({ message: 'Not authorized as COO' });
    }
    try {
        const deposits = await prisma.deposit.findMany({
            include: {
                addedBy: { select: { name: true, designation: true } }
            },
            orderBy: { addedAt: 'desc' }
        });
        res.json(deposits);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get Spent History
// @route   GET /api/finance/history
// @access  Private (AM, COO, Admin)
const getSpentHistory = async (req, res) => {
    if (!isCOO(req.user)) {
        return res.status(403).json({ message: 'Not authorized as COO' });
    }
    try {
        const history = await prisma.voucher.findMany({
            where: {}, // Show all vouchers for history tracking
            include: {
                user: { select: { name: true, designation: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const exportFinanceData = async (req, res) => {
    if (!isCOO(req.user)) {
        return res.status(403).json({ message: 'Not authorized as COO' });
    }
    try {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        const vouchers = await prisma.voucher.findMany({
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const deposits = await prisma.deposit.findMany({
            include: { addedBy: { select: { name: true } } },
            orderBy: { addedAt: 'desc' }
        });

        // 1. Business Summary Sheet (Pivot-like)
        const summarySheet = workbook.addWorksheet('Business Summary');
        
        // Header Style
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        
        // --- Status Breakdown ---
        summarySheet.mergeCells('A1:B1');
        summarySheet.getCell('A1').value = 'Voucher Status Breakdown';
        summarySheet.getCell('A1').fill = headerFill;
        summarySheet.getCell('A1').font = headerFont;
        summarySheet.getCell('A1').alignment = { horizontal: 'center' };

        const statusCounts = vouchers.reduce((acc, v) => {
            acc[v.status] = (acc[v.status] || 0) + v.amount;
            return acc;
        }, {});

        let rowIdx = 2;
        Object.entries(statusCounts).forEach(([status, amount]) => {
            summarySheet.getCell(`A${rowIdx}`).value = status;
            summarySheet.getCell(`B${rowIdx}`).value = amount;
            summarySheet.getCell(`B${rowIdx}`).numFmt = '₹#,##0.00';
            rowIdx++;
        });

        // --- Type Breakdown ---
        rowIdx += 2;
        summarySheet.mergeCells(`A${rowIdx}:B${rowIdx}`);
        summarySheet.getCell(`A${rowIdx}`).value = 'Voucher Type Breakdown';
        summarySheet.getCell(`A${rowIdx}`).fill = headerFill;
        summarySheet.getCell(`A${rowIdx}`).font = headerFont;
        summarySheet.getCell(`A${rowIdx}`).alignment = { horizontal: 'center' };
        rowIdx++;

        const typeCounts = vouchers.reduce((acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + v.amount;
            return acc;
        }, {});

        Object.entries(typeCounts).forEach(([type, amount]) => {
            summarySheet.getCell(`A${rowIdx}`).value = type;
            summarySheet.getCell(`B${rowIdx}`).value = amount;
            summarySheet.getCell(`B${rowIdx}`).numFmt = '₹#,##0.00';
            rowIdx++;
        });

        // --- Top Spenders ---
        rowIdx += 2;
        summarySheet.mergeCells(`A${rowIdx}:B${rowIdx}`);
        summarySheet.getCell(`A${rowIdx}`).value = 'Top Spenders (All Time)';
        summarySheet.getCell(`A${rowIdx}`).fill = headerFill;
        summarySheet.getCell(`A${rowIdx}`).font = headerFont;
        summarySheet.getCell(`A${rowIdx}`).alignment = { horizontal: 'center' };
        rowIdx++;

        const userSpends = vouchers.reduce((acc, v) => {
            const name = v.user?.name || 'Unknown';
            acc[name] = (acc[name] || 0) + v.amount;
            return acc;
        }, {});

        Object.entries(userSpends)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([name, amount]) => {
                summarySheet.getCell(`A${rowIdx}`).value = name;
                summarySheet.getCell(`B${rowIdx}`).value = amount;
                summarySheet.getCell(`B${rowIdx}`).numFmt = '₹#,##0.00';
                rowIdx++;
            });

        summarySheet.getColumn('A').width = 30;
        summarySheet.getColumn('B').width = 20;

        // --- VISUAL PIE CHART ---
        try {
            const chartData = Object.entries(statusCounts);
            const labels = chartData.map(c => c[0]);
            const values = chartData.map(c => c[1]);
            const colors = ['#059669', '#E11D48', '#D97706', '#2563EB', '#6366F1'];

            const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.slice(0, labels.length)
                    }]
                },
                options: {
                    plugins: {
                        legend: { position: 'right' },
                        title: { display: true, text: 'Expenses by Status', font: { size: 18 } }
                    }
                }
            }))}`;

            const resChart = await fetch(chartUrl);
            const buffer = await resChart.arrayBuffer();
            const imageId = workbook.addImage({
                buffer: Buffer.from(buffer),
                extension: 'png',
            });

            summarySheet.addImage(imageId, {
                tl: { col: 3, row: 1 },
                ext: { width: 400, height: 300 }
            });
        } catch (chartErr) {
            console.error('Chart Generation failed:', chartErr);
            // Non-blocking, continue without chart
        }

        // 2. Vouchers Sheet
        const voucherSheet = workbook.addWorksheet('Vouchers List');
        voucherSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'User', key: 'userName', width: 25 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Purpose', key: 'purpose', width: 40 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'AM Status', key: 'amStatus', width: 15 },
            { header: 'COO Status', key: 'cooStatus', width: 15 }
        ];

        // Format Header
        voucherSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        voucherSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

        vouchers.forEach(v => {
            const row = voucherSheet.addRow({
                id: v.id,
                userName: v.user?.name,
                type: v.type,
                amount: v.amount,
                purpose: v.purpose,
                status: v.status,
                date: v.date.toISOString().split('T')[0],
                amStatus: v.amStatus,
                cooStatus: v.cooStatus
            });

            // Conditional Coloring for Status
            const statusCell = row.getCell('status');
            if (v.status === 'COMPLETED') statusCell.font = { color: { argb: 'FF059669' }, bold: true };
            if (v.status === 'REJECTED') statusCell.font = { color: { argb: 'FFE11D48' }, bold: true };
            if (v.status === 'PENDING') statusCell.font = { color: { argb: 'FFD97706' }, bold: true };
            if (v.status === 'WAITING') statusCell.font = { color: { argb: 'FF2563EB' }, bold: true };
            
            row.getCell('amount').numFmt = '₹#,##0.00';
        });

        // 3. Deposits Sheet
        const depositSheet = workbook.addWorksheet('Deposits List');
        depositSheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Source', key: 'source', width: 25 },
            { header: 'Reason', key: 'reason', width: 40 },
            { header: 'Added By', key: 'addedByName', width: 25 },
            { header: 'Date', key: 'date', width: 20 }
        ];

        depositSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        depositSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

        deposits.forEach(d => {
            const row = depositSheet.addRow({
                id: d.id,
                amount: d.amount,
                source: d.source,
                reason: d.reason,
                addedByName: d.addedBy?.name,
                date: d.addedAt.toISOString().split('T')[0]
            });
            row.getCell('amount').numFmt = '₹#,##0.00';
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Expense_Hub_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Export failed' });
    }
};

const wipeFinanceData = async (req, res) => {
    try {
        // Double check it's an ADMIN
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only superadmins can reset the accounting cycle' });
        }

        // Wipe Vouchers and Deposits
        await prisma.voucher.deleteMany({});
        await prisma.deposit.deleteMany({});

        // Reset Finance Global state
        await prisma.finance.updateMany({
            data: { currentCash: 0, totalSpent: 0 }
        });

        res.json({ message: 'Accounting cycle has been reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Wipe failed', error: error.message });
    }
};

module.exports = {
    getFinanceSummary,
    addCash,
    getSpentHistory,
    getDepositHistory,
    exportFinanceData,
    wipeFinanceData
};

