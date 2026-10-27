const express = require('express');
const router = express.Router();
const {
    createVoucher,
    getMyVouchers,
    getManageableVouchers,
    approveVoucherAM,
    approveVoucherCOO,
    uploadProof,
    addAdminNote,
    payVoucher,
    disburseVoucher,
    settleVoucher,
    deleteVoucher
} = require('../controllers/voucherController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.route('/')
    .post(protect, upload.single('proof'), createVoucher);

router.route('/me')
    .get(protect, getMyVouchers);

router.route('/manage')
    .get(protect, authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTS_MANAGER', 'BUSINESS_HEAD', 'COO', 'Chief Operational Officer'), getManageableVouchers);

router.route('/:id/approve-am')
    .put(protect, authorize('ACCOUNTS_MANAGER'), approveVoucherAM);

router.route('/:id/approve-coo')
    .put(protect, authorize('ADMIN', 'BUSINESS_HEAD', 'COO', 'Chief Operational Officer'), approveVoucherCOO);

router.route('/:id/pay')
    .put(protect, authorize('ACCOUNTS_MANAGER'), payVoucher);

router.route('/:id/disburse')
    .put(protect, authorize('ACCOUNTS_MANAGER'), disburseVoucher);

router.route('/:id/settle')
    .put(protect, authorize('ACCOUNTS_MANAGER', 'ADMIN'), upload.single('proof'), settleVoucher);

router.route('/:id/proof')
    .put(protect, upload.single('proof'), uploadProof);

router.route('/:id/admin-note')
    .put(protect, authorize('ACCOUNTS_MANAGER'), addAdminNote);

router.route('/:id')
    .delete(protect, authorize('ACCOUNTS_MANAGER'), deleteVoucher);

module.exports = router;
