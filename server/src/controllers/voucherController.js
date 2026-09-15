const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { parseRobustDate } = require('../utils/dateHelpers');

// @desc    Create new Voucher
// @route   POST /api/vouchers
// @access  Private (Employee)
const createVoucher = async (req, res) => {
    try {
        if (req.user.role === 'ADMIN') {
            return res.status(403).json({ message: 'Administrators have view-only access to vouchers.' });
        }

        console.log('DEBUG: Full req.body:', JSON.stringify(req.body, null, 2));
        const userId = req.user.role === 'ACCOUNTS_MANAGER' && req.body.targetUserId 
            ? parseInt(req.body.targetUserId) 
            : req.user.id;
        
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
        const { role, designation, email } = req.user;
        let where = {};

        const userDesignation = (designation || '').toUpperCase();
        const isCOOUser = (role === 'BUSINESS_HEAD' && (userDesignation === 'COO' || userDesignation.includes('CHIEF OPERATIONAL OFFICER'))) || email === 'designs.cookscape@gmail.com';

        if (role === 'ACCOUNTS_MANAGER') {
            // Accounts Manager needs to see items needing AM approval OR items approved by COO waiting for payment
            where = { 
                status: {
                    in: ['PENDING', 'APPROVED']
                }
            };
        } else if (isCOOUser) {
            // COO only needs to see items specifically waiting for COO approval
            where = { amStatus: 'APPROVED', cooStatus: 'PENDING', status: { in: ['PENDING', 'APPROVED'] } };
        } else if (role === 'ADMIN') {
            // Admin has view-only access to pending items
            where = { status: { in: ['PENDING', 'APPROVED'] } };
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

        if (req.user.role !== 'ACCOUNTS_MANAGER') {
            return res.status(403).json({ message: 'Only Accounts Manager can review/approve at the AM stage. Administrators have view-only access.' });
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
// @access  Private (BUSINESS_HEAD / COO)
const approveVoucherCOO = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const cooId = req.user.id;
        const { designation, role, email } = req.user;

        const isCOOUser = (role === 'BUSINESS_HEAD' && (designation === 'COO' || designation === 'Chief Operational Officer')) || email === 'designs.cookscape@gmail.com';

        if (!isCOOUser) {
            return res.status(403).json({ message: 'Not authorized as COO. Only designs.cookscape@gmail.com / COO can review and confirm. Administrators have view-only access.' });
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
                status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
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

        if (!voucher || (voucher.userId !== userId && !['ADMIN', 'SUPERADMIN', 'ACCOUNTS_MANAGER'].includes(req.user.role))) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (voucher.status !== 'WAITING') {
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
// @access  Private (ACCOUNTS_MANAGER)
const addAdminNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        const adminId = req.user.id;

        if (req.user.role !== 'ACCOUNTS_MANAGER') {
            return res.status(403).json({ message: 'Only Accounts Manager can add notes. Administrators have view-only access.' });
        }

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
// @access  Private (ACCOUNTS_MANAGER)
const payVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const amId = req.user.id;

        if (req.user.role !== 'ACCOUNTS_MANAGER') {
            return res.status(403).json({ message: 'Only Accounts Manager can mark vouchers as paid. Administrators have view-only access.' });
        }

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        if (voucher.amStatus === 'REJECTED' || voucher.cooStatus === 'REJECTED') {
            return res.status(400).json({ message: 'Cannot pay a rejected voucher' });
        }

        if (voucher.amStatus !== 'APPROVED') {
            return res.status(400).json({ message: 'Voucher must be reviewed and approved by Accounts Manager first' });
        }

        if (voucher.cooStatus !== 'APPROVED') {
            return res.status(400).json({ message: 'Voucher must be reviewed and confirmed by COO before marking as PAID' });
        }

        // AM gives amount and changes paid status
        const parsedAmount = (req.body.amount !== undefined && req.body.amount !== '') 
            ? parseFloat(req.body.amount) 
            : voucher.amount;

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount' });
        }

        const paymentNote = req.body.remarks ? `: ${req.body.remarks}` : '';
        const updateData = {
            status: 'PAID',
            amount: parsedAmount,
            adminRemarks: voucher.adminRemarks 
                ? `${voucher.adminRemarks} | Payment of ₹${parsedAmount.toLocaleString()} confirmed by ${req.user.name}${paymentNote}` 
                : `Payment of ₹${parsedAmount.toLocaleString()} confirmed by ${req.user.name}${paymentNote}`
        };

        const updatedVoucher = await prisma.voucher.update({
            where: { id: parseInt(id) },
            data: updateData,
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

// @desc    Mark Voucher as Disbursed (AM)
// @route   PUT /api/vouchers/:id/disburse
// @access  Private (ACCOUNTS_MANAGER)
const disburseVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const amId = req.user.id;

        if (req.user.role !== 'ACCOUNTS_MANAGER') {
            return res.status(403).json({ message: 'Only Accounts Manager can disburse vouchers. Administrators have view-only access.' });
        }

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        if (voucher.status !== 'PAID') {
            return res.status(400).json({ message: 'Voucher must be marked as PAID before disbursement' });
        }

        // Determine final status
        // If it's a postpaid/bill-already-attached type, it's COMPLETED
        // If it's an advance/prepaid type, it's WAITING (for proof)
        const finalStatus = (voucher.type === 'POSTPAID' || voucher.type === 'COMPANY_PAY_AFTER') ? 'COMPLETED' : 'WAITING';

        const updatedVoucher = await prisma.voucher.update({
            where: { id: parseInt(id) },
            data: {
                status: finalStatus,
                adminRemarks: voucher.adminRemarks 
                    ? `${voucher.adminRemarks} | Disbursed by ${req.user.name}` 
                    : `Disbursed by ${req.user.name}`
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

// @desc    Delete Voucher (ACCOUNTS_MANAGER only)
// @route   DELETE /api/vouchers/:id
// @access  Private (ACCOUNTS_MANAGER)
const deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== 'ACCOUNTS_MANAGER') {
            return res.status(403).json({ message: 'Only accounts managers can delete vouchers. Administrators have view-only access.' });
        }

        const voucher = await prisma.voucher.findUnique({
            where: { id: parseInt(id) }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        // Financial reversal if money was already deducted
        // Status COMPLETED or WAITING or PAID means money was deducted after AM marked as Paid
        if (voucher.status === 'COMPLETED' || voucher.status === 'WAITING' || voucher.status === 'PAID') {
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
    disburseVoucher,
    deleteVoucher
};
