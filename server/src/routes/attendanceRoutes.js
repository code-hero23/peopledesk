const express = require('express');
const router = express.Router();
const { markAttendance, checkoutAttendance, getAttendanceStatus } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, markAttendance);
router.put('/checkout', protect, checkoutAttendance);
router.get('/today', protect, getAttendanceStatus);

module.exports = router;
