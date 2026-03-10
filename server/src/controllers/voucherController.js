const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { parseRobustDate } = require('../utils/dateHelpers');

// @desc    Create new Voucher
// @route   POST /api/vouchers
// @access  Private (Employee)
const createVoucher = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, amount, purpose, date } = req.body;
        let proofUrl = req.body.proofUrl;

        // If file is uploaded, use it
        if (req.file) {
            proofUrl = `/api/uploads/${req.file.filename}`;
        }

        if (!amount || !purpose) {
            return res.status(400).json({ message: 'Amount and purpose are required' });
        }

        if (type === 'POSTPAID' && !proofUrl) {
            return res.status(400).json({ message: 'Bill/Proof is mandatory for Postpaid vouchers' });
        }

        const isAM = req.user.role === 'ACCOUNTS_MANAGER';

        const voucher = await prisma.voucher.create({
            data: {
                userId,
                type: type || 'POSTPAID',
                amount: parseFloat(amount),
                purpose,
                date: date ? parseRobustDate(date) : new Date(),
                proofUrl: proofUrl || null,
                status: 'PENDING',
                amStatus: isAM ? 'APPROVED' : 'PENDING',
                amId: isAM ? userId : null,
                amApprovedAt: isAM ? new Date() : null,
                cooStatus: 'PENDING'
            }
        });

        res.status(201).json(voucher);
    } catch (error) {
        console.error('ERROR in createVoucher:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get my vouchers
// @route   GET /api/vouchers/me
// @access  Private
const getMyVouchers = async (req, res) => {
    try {
        const userId = req.user.id;
        const vouchers = await prisma.voucher.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(vouchers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get manageable vouchers (for AM, COO, ADMIN)
// @route   GET /api/vouchers/manage
// @access  Private (ACCOUNTS_MANAGER, BUSINESS_HEAD, ADMIN)
const getManageableVouchers = async (req, res) => {
    try {
        const { role, designation } = req.user;
        let where = {};

        if (role === 'ACCOUNTS_MANAGER') {
            where = { amStatus: 'PENDING' };
        } else if (role === 'BUSINESS_HEAD' && (designation === 'COO' || designation === 'Chief Operational Officer')) {
            where = { amStatus: 'APPROVED', cooStatus: 'PENDING' };
        } else if (role === 'ADMIN') {
            where = {}; // Admin can see all for monitoring
        } else {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const vouchers = await prisma.voucher.findMany({
            where,
            include: {
                user: {
                    select: { name: true, designation: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(vouchers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Approve/Reject Voucher (AM)
// @route   PUT /api/vouchers/:id/approve-am
// @access  Private (ACCOUNTS_MANAGER)
const approveVoucherAM = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body; // 'APPROVED' or 'REJECTED'
        const amId = req.user.id;

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        const updateData = {
            amId,
            amStatus: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
            amRemarks: remarks || null,
            amApprovedAt: new Date(),
            status: status === 'REJECTED' ? 'REJECTED' : 'PENDING'
        };

        const updatedVoucher = await prisma.voucher.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json(updatedVoucher);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Approve/Reject Voucher (COO)
// @route   PUT /api/vouchers/:id/approve-coo
// @access  Private (BUSINESS_HEAD)
const approveVoucherCOO = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const cooId = req.user.id;
        const { designation } = req.user;

        if (designation !== 'COO' && designation !== 'Chief Operational Officer') {
            return res.status(403).json({ message: 'Not authorized as COO' });
        }

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher || voucher.amStatus !== 'APPROVED') {
            return res.status(400).json({ message: 'Voucher not found or not yet approved by Accounts Manager' });
        }

        let finalStatus = voucher.status;
        if (status === 'APPROVED') {
            finalStatus = voucher.type === 'POSTPAID' ? 'COMPLETED' : 'WAITING';
        } else {
            finalStatus = 'REJECTED';
        }

        const updatedVoucher = await prisma.voucher.update({
            where: { id: parseInt(id) },
            data: {
                cooId,
                cooStatus: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                cooRemarks: remarks || null,
                cooApprovedAt: new Date(),
                status: finalStatus
            }
        });

        // Deduct from Finance for both COMPLETED (Postpaid) and WAITING (Prepaid Advance)
        if (status === 'APPROVED') {
            const finance = await prisma.finance.findFirst();
            if (finance) {
                await prisma.finance.update({
                    where: { id: finance.id },
                    data: {
                        currentCash: finance.currentCash - updatedVoucher.amount,
                        totalSpent: finance.totalSpent + updatedVoucher.amount
                    }
                });
            }
        }

        res.json(updatedVoucher);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Upload Proof (Prepaid completion)
// @route   PUT /api/vouchers/:id/proof
// @access  Private (Owner)
const uploadProof = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        let proofUrl = req.body.proofUrl;

        // If file is uploaded, use it
        if (req.file) {
            proofUrl = `/api/uploads/${req.file.filename}`;
        }

        if (!proofUrl) {
            return res.status(400).json({ message: 'Proof file or link is required' });
        }

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher || voucher.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (voucher.status !== 'WAITING' && (voucher.type === 'PREPAID' || voucher.type === 'ADVANCE')) {
            return res.status(400).json({ message: 'Voucher must be in WAITING state before uploading settlement proof' });
        }

        const updatedVoucher = await prisma.voucher.update({
            where: { id: parseInt(id) },
            data: {
                proofUrl,
                status: 'COMPLETED'
            }
        });

        // No finance deduction here because it already happened at COO approval (Advance issued)

        res.json(updatedVoucher);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Add Admin Note to Voucher
// @route   PUT /api/vouchers/:id/admin-note
// @access  Private (Admin)
const addAdminNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        const adminId = req.user.id;

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        const updatedVoucher = await prisma.voucher.update({
            where: { id: parseInt(id) },
            data: {
                adminId,
                adminRemarks: remarks || null
            }
        });

        res.json(updatedVoucher);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    createVoucher,
    getMyVouchers,
    getManageableVouchers,
    approveVoucherAM,
    approveVoucherCOO,
    uploadProof,
    addAdminNote
};
