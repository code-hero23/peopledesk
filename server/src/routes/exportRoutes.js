const express = require('express');
const router = express.Router();
const { exportWorkLogs, exportAttendance } = require('../controllers/exportController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/worklogs', protect, authorize('ADMIN'), exportWorkLogs);
router.get('/attendance', protect, authorize('ADMIN'), exportAttendance);

module.exports = router;
