const express = require('express');
const router = express.Router();
const { exportWorkLogs, exportAttendance } = require('../controllers/exportController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/worklogs', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), exportWorkLogs);
router.get('/attendance', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), exportAttendance);

module.exports = router;
