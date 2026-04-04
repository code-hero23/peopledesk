const express = require('express');
const router = express.Router();
const {
    setEmployeeScore,
    getPerformanceHistory,
    getMyPerformance
} = require('../controllers/performanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/my-scores', protect, getMyPerformance);
router.get('/history/:userId', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), getPerformanceHistory);
router.post('/set', protect, authorize('ADMIN', 'HR'), setEmployeeScore);

module.exports = router;
