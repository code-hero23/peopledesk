const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get Financial Summary
// @route   GET /api/finance/summary
// @access  Private (AM, COO, Admin)
const getFinanceSummary = async (req, res) => {
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
    try {
        const history = await prisma.voucher.findMany({
            where: { status: { in: ['COMPLETED', 'WAITING'] } },
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

module.exports = {
    getFinanceSummary,
    addCash,
    getSpentHistory,
    getDepositHistory
};
