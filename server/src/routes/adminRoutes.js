const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    getAllPendingRequests,
    getRequestHistory,
    updateRequestStatus,
    updateUserStatus,
    createEmployee,
    getAllWorkLogs,
    getDailyWorkLogs,
    getAllAttendance,
    getDailyAttendance,
    getActiveStatuses,
    updateEmployee,
    deleteEmployee,
    importEmployees,
    deleteRequest
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { upload, uploadExcel } = require('../middlewares/uploadMiddleware');

router.get('/employees', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'), getAllEmployees);
router.post('/employees', protect, authorize('ADMIN', 'AE_MANAGER'), createEmployee);
router.post('/employees/import', protect, authorize('ADMIN'), uploadExcel.single('file'), importEmployees);

// Work Logs & Attendance - Accessible by Admin, BH, HR
router.get('/worklogs', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'), getAllWorkLogs);
router.get('/worklogs/daily', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'), getDailyWorkLogs);
router.get('/attendance', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'), getAllAttendance);
router.get('/attendance/daily', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'), getDailyAttendance);
router.get('/active-statuses', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'), getActiveStatuses);

// Requests - Accessible by Admin, BH, HR
router.get('/requests/pending', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'), getAllPendingRequests);
router.get('/requests/history', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'), getRequestHistory);
router.put('/requests/:type/:id', protect, authorize('BUSINESS_HEAD', 'HR', 'AE_MANAGER'), updateRequestStatus);
router.delete('/requests/:type/:id', protect, authorize('ADMIN', 'HR'), deleteRequest);

// User Management - Admin Only
router.put('/users/:id/status', protect, authorize('ADMIN'), updateUserStatus);
router.put('/users/:id', protect, authorize('ADMIN'), updateEmployee);
router.delete('/users/:id', protect, authorize('ADMIN'), deleteEmployee);

module.exports = router;
