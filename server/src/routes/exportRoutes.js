const express = require('express');
const router = express.Router();
const { exportWorkLogs, exportAttendance, exportRequests } = require('../controllers/exportController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/worklogs', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'), exportWorkLogs);
router.get('/attendance', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'), exportAttendance);
router.get('/requests', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'), exportRequests);

module.exports = router;
