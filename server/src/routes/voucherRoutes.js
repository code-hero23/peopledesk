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
    deleteVoucher
} = require('../controllers/voucherController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.route('/')
    .post(protect, upload.single('proof'), createVoucher);

router.route('/me')
    .get(protect, getMyVouchers);

router.route('/manage')
    .get(protect, authorize('ADMIN', 'ACCOUNTS_MANAGER', 'BUSINESS_HEAD'), getManageableVouchers);

router.route('/:id/approve-am')
    .put(protect, authorize('ACCOUNTS_MANAGER', 'ADMIN'), approveVoucherAM);

router.route('/:id/approve-coo')
    .put(protect, authorize('BUSINESS_HEAD', 'ADMIN'), approveVoucherCOO);

router.route('/:id/proof')
    .put(protect, upload.single('proof'), uploadProof);

router.route('/:id/admin-note')
    .put(protect, authorize('ADMIN'), addAdminNote);

router.route('/:id')
    .delete(protect, authorize('ADMIN'), deleteVoucher);

module.exports = router;
