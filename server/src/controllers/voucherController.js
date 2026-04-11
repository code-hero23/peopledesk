const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { parseRobustDate } = require('../utils/dateHelpers');

// @desc    Create new Voucher
// @route   POST /api/vouchers
// @access  Private (Employee)
const createVoucher = async (req, res) => {
    try {
        console.log('DEBUG: Full req.body:', JSON.stringify(req.body, null, 2));
        const userId = req.user.id;
        const { type, amount, purpose, date } = req.body;
        let proofUrl = req.body.proofUrl;

        console.log('DEBUG: CreateVoucher Request:', {
            userId,
            type,
            amount,
            purpose,
            date,
            hasFile: !!req.file
        });

        // If file is uploaded, use it
        if (req.file) {
            proofUrl = `/api/uploads/${req.file.filename}`;
            console.log('DEBUG: File uploaded:', proofUrl);
        }

        if (!amount || !purpose) {
            console.log('DEBUG: Missing amount or purpose');
            return res.status(400).json({ message: 'Amount and purpose are required' });
        }

        if (type === 'POSTPAID' && !proofUrl) {
            console.log('DEBUG: Missing proof for POSTPAID');
            return res.status(400).json({ message: 'Bill/Proof is mandatory for Postpaid vouchers' });
        }

        const isAM = req.user.role === 'ACCOUNTS_MANAGER';
        const parsedAmount = parseFloat(amount);
        const parsedDate = date ? parseRobustDate(date) : new Date();

        console.log('DEBUG: Parsed values:', { parsedAmount, parsedDate, isAM });

        if (isNaN(parsedAmount)) {
            console.log('DEBUG: Invalid amount:', amount);
            return res.status(400).json({ message: 'Invalid amount value' });
        }

        const prismaData = {
            userId,
            type: type || 'POSTPAID',
            amount: parsedAmount,
            purpose,
            date: parsedDate,
            proofUrl: proofUrl || null,
            status: 'PENDING',
            amStatus: isAM ? 'APPROVED' : 'PENDING',
            amId: isAM ? userId : null,
            amApprovedAt: isAM ? new Date() : null,
            cooStatus: 'PENDING'
        };

        console.log('DEBUG: Final Prisma Data:', prismaData);

        const voucher = await prisma.voucher.create({
            data: prismaData
        });

        console.log('DEBUG: Voucher created successfully:', voucher.id);
        res.status(201).json(voucher);
    } catch (error) {
        console.error('CRITICAL ERROR in createVoucher:', error);
        if (error.code) console.error('Prisma Error Code:', error.code);
        if (error.meta) console.error('Prisma Error Meta:', JSON.stringify(error.meta));
        
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message,
            code: error.code,
            meta: error.meta,
            stack: process.env.NODE_ENV === 'production' ? '🍰' : error.stack
        });
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
            where = { 
                OR: [
                    { amStatus: 'PENDING' },
                    { cooStatus: 'APPROVED', status: 'PAID' }
                ]
            };
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
        const isAdmin = req.user.role === 'ADMIN';

        if (req.user.role !== 'ACCOUNTS_MANAGER' && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized for AM approval' });
        }

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
        const { designation, role } = req.user;
        const isAdmin = role === 'ADMIN';

        if (!isAdmin && designation !== 'COO' && designation !== 'Chief Operational Officer') {
            return res.status(403).json({ message: 'Not authorized as COO' });
        }

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher || voucher.amStatus !== 'APPROVED') {
            return res.status(400).json({ message: 'Voucher not found or not yet approved by Accounts Manager' });
        }

        const updatedVoucher = await prisma.voucher.update({
            where: { id: parseInt(id) },
            data: {
                cooId,
                cooStatus: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                cooRemarks: remarks || null,
                cooApprovedAt: new Date(),
                status: status === 'APPROVED' ? 'PAID' : 'REJECTED'
            },
            include: {
                user: {
                    select: { name: true, designation: true, email: true }
                }
            }
        });

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

// @desc    Mark Voucher as Paid (AM)
// @route   PUT /api/vouchers/:id/pay
// @access  Private (ACCOUNTS_MANAGER, ADMIN)
const payVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const amId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        if (req.user.role !== 'ACCOUNTS_MANAGER' && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher || voucher.cooStatus !== 'APPROVED') {
            return res.status(400).json({ message: 'Voucher not found or not yet approved by COO' });
        }

        if (voucher.status !== 'PAID') {
            return res.status(400).json({ message: 'Voucher is not in PAID state' });
        }

        // Determine final status
        const immediateTypes = ['POSTPAID', 'COMPANY_PAY_AFTER'];
        const finalStatus = immediateTypes.includes(voucher.type) ? 'COMPLETED' : 'WAITING';

        const updatedVoucher = await prisma.voucher.update({
            where: { id: parseInt(id) },
            data: {
                status: finalStatus,
                adminRemarks: voucher.adminRemarks ? `${voucher.adminRemarks} | Payment confirmed by ${req.user.name}` : `Payment confirmed by ${req.user.name}`
            },
            include: {
                user: {
                    select: { name: true, designation: true, email: true }
                }
            }
        });

        // Deduct from Finance
        let finance = await prisma.finance.findFirst();
        if (!finance) {
            finance = await prisma.finance.create({
                data: { currentCash: 0, totalSpent: 0 }
            });
        }

        await prisma.finance.update({
            where: { id: finance.id },
            data: {
                currentCash: finance.currentCash - updatedVoucher.amount,
                totalSpent: finance.totalSpent + updatedVoucher.amount
            }
        });

        res.json(updatedVoucher);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete Voucher (Admin only)
// @route   DELETE /api/vouchers/:id
// @access  Private (ADMIN)
const deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;

        // Double check it's an ADMIN
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only superadmins can delete vouchers' });
        }

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        // Financial reversal if money was already deducted
        // Status COMPLETED or WAITING means money was deducted after AM marked as Paid
        if (voucher.status === 'COMPLETED' || voucher.status === 'WAITING') {
            const finance = await prisma.finance.findFirst();
            if (finance) {
                await prisma.finance.update({
                    where: { id: finance.id },
                    data: {
                        currentCash: finance.currentCash + voucher.amount,
                        totalSpent: Math.max(0, finance.totalSpent - voucher.amount)
                    }
                });
            }
        }

        await prisma.voucher.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Voucher deleted successfully', id: parseInt(id) });
    } catch (error) {
        console.error('ERROR in deleteVoucher:', error);
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
    addAdminNote,
    payVoucher,
    deleteVoucher
};
