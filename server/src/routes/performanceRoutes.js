const express = require('express');
const router = express.Router();
const {
    setEmployeeScore,
    calculateAutomatedMetrics,
    getPerformanceHistory,
    getMyPerformance,
    importPerformanceScores
} = require('../controllers/performanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/my-scores', protect, getMyPerformance);
router.get('/history/:userId', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), getPerformanceHistory);
router.get('/calculate/:userId', protect, authorize('ADMIN', 'HR'), calculateAutomatedMetrics);
router.post('/set', protect, authorize('ADMIN', 'HR'), setEmployeeScore);
router.post('/import', protect, authorize('ADMIN', 'HR'), importPerformanceScores);

module.exports = router;
