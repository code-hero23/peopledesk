const express = require('express');
const router = express.Router();
const {
    getStaffList,
    createVisitorRecord,
    getVisitorRecords,
    resendVisitorWhatsApp
} = require('../controllers/visitorController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/staff', getStaffList);
router.post('/', createVisitorRecord);
router.get('/', getVisitorRecords);
router.post('/:id/resend-whatsapp', resendVisitorWhatsApp);

module.exports = router;
