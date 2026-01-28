const express = require('express');
const router = express.Router();
const { markAttendance, checkoutAttendance, getAttendanceStatus } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.post('/', protect, upload.single('photo'), markAttendance);
router.put('/checkout', protect, upload.single('photo'), checkoutAttendance);
router.get('/today', protect, getAttendanceStatus);

module.exports = router;
