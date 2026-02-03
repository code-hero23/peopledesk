const express = require('express');
const router = express.Router();
const { markAttendance, checkoutAttendance, getAttendanceStatus, pauseAttendance, resumeAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.post('/', protect, upload.single('photo'), markAttendance);
router.put('/checkout', protect, upload.single('photo'), checkoutAttendance);
router.get('/today', protect, getAttendanceStatus);
router.post('/pause', protect, pauseAttendance);
router.post('/resume', protect, resumeAttendance);

module.exports = router;
