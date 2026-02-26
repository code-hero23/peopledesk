const express = require('express');
const router = express.Router();
const { generatePayrollReport } = require('../controllers/payrollController');
const { getMySalarySummary } = require('../controllers/salaryController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/report', protect, generatePayrollReport);
router.get('/my-summary', protect, getMySalarySummary);

module.exports = router;
