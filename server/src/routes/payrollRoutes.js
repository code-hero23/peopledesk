const express = require('express');
const router = express.Router();
const { generatePayrollReport, importManualPayroll } = require('../controllers/payrollController');
const { getMySalarySummary } = require('../controllers/salaryController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { uploadExcel } = require('../middlewares/uploadMiddleware');

router.get('/report', protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD', 'ACCOUNT'), generatePayrollReport);
router.post('/import-manual', protect, uploadExcel.single('file'), importManualPayroll);
router.get('/my-summary', protect, getMySalarySummary);

module.exports = router;
