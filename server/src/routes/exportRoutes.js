const express = require('express');
const router = express.Router();
const { exportWorkLogs, exportAttendance, exportRequests, exportPerformanceAnalytics, exportEmployees, exportIncentiveScorecard, exportCallLogs, emailCallLogs, exportEmployeeContributionReport, exportEmployeeTaskSummary } = require('../controllers/exportController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/worklogs', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'), exportWorkLogs);
router.get('/attendance', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'), exportAttendance);
router.get('/requests', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'), exportRequests);
router.get('/analytics', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), exportPerformanceAnalytics);
router.get('/incentives', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), exportIncentiveScorecard);
router.get('/employees', protect, authorize('ADMIN'), exportEmployees);
router.get('/call-stats', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'ANALYZER'), exportCallLogs);
router.get('/employee-contribution', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), exportEmployeeContributionReport);
router.get('/task-summary', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), exportEmployeeTaskSummary);
router.post('/call-stats/email', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'ANALYZER'), emailCallLogs);

module.exports = router;
