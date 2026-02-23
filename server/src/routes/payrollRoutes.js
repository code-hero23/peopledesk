const express = require('express');
const router = express.Router();
const { generatePayrollReport } = require('../controllers/payrollController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/report', protect, generatePayrollReport);

module.exports = router;
