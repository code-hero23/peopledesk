const express = require('express');
const router = express.Router();
const { getFinanceSummary, addCash, getSpentHistory, getDepositHistory } = require('../controllers/financeController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/summary', protect, authorize('ADMIN', 'ACCOUNTS_MANAGER', 'BUSINESS_HEAD'), getFinanceSummary);
router.get('/history', protect, authorize('ADMIN', 'ACCOUNTS_MANAGER', 'BUSINESS_HEAD'), getSpentHistory);
router.get('/deposits', protect, authorize('ADMIN', 'ACCOUNTS_MANAGER', 'BUSINESS_HEAD'), getDepositHistory);
router.post('/add-cash', protect, authorize('ADMIN', 'ACCOUNTS_MANAGER'), addCash);

module.exports = router;
