const express = require('express');
const router = express.Router();
const { getEmployeeStats, getTeamOverview } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/employee/:id', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), getEmployeeStats);
router.get('/overview', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), getTeamOverview);

module.exports = router;
