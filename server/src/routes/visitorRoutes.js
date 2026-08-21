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

router.use(protect);

router.get('/staff', getStaffList);
router.post('/', createVisitorRecord);
router.get('/', getVisitorRecords);
router.post('/:id/resend-whatsapp', resendVisitorWhatsApp);
router.delete('/:id', authorize('ADMIN'), deleteVisitorRecord);

module.exports = router;
