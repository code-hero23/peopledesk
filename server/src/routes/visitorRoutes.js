const express = require('express');
const router = express.Router();
const {
    getStaffList,
    createVisitorRecord,
    getVisitorRecords,
    resendVisitorWhatsApp,
    deleteVisitorRecord
} = require('../controllers/visitorController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Custom middleware ensuring ONLY Front Desk Manager, Admin, and Business Heads (BH) can access Visitors Book
const authorizeVisitorAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const role = (req.user.role || '').toUpperCase();
    const designation = (req.user.designation || '').toUpperCase();

    const isAllowed = (
        role === 'FRONT_DESK_MANAGER' ||
        designation.includes('FRONT DESK') ||
        role === 'ADMIN' ||
        role === 'SUPER_ADMIN' ||
        role === 'BUSINESS_HEAD' ||
        designation.includes('BUSINESS HEAD') ||
        designation === 'BH'
    );

    if (!isAllowed) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Visitors Book is visible only to Front Desk Manager, Admin, and Business Heads (BH).'
        });
    }

    next();
};

router.use(protect);
router.use(authorizeVisitorAccess);

router.get('/staff', getStaffList);
router.post('/', createVisitorRecord);
router.get('/', getVisitorRecords);
router.post('/:id/resend-whatsapp', resendVisitorWhatsApp);
router.delete('/:id', authorize('ADMIN'), deleteVisitorRecord);

module.exports = router;
