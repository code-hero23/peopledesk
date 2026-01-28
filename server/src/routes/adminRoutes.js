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
    updateEmployee,
    deleteEmployee,
    importEmployees
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { upload, uploadExcel } = require('../middlewares/uploadMiddleware');

router.get('/employees', protect, authorize('ADMIN'), getAllEmployees);
router.post('/employees', protect, authorize('ADMIN'), createEmployee);
router.post('/employees/import', protect, authorize('ADMIN'), uploadExcel.single('file'), importEmployees);

// Work Logs & Attendance - Accessible by Admin, BH, HR
router.get('/worklogs', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), getAllWorkLogs);
router.get('/worklogs/daily', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), getDailyWorkLogs);
router.get('/attendance', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), getAllAttendance);
router.get('/attendance/daily', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), getDailyAttendance);

// Requests - Accessible by Admin, BH, HR
router.get('/requests/pending', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), getAllPendingRequests);
router.get('/requests/history', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), getRequestHistory);
router.put('/requests/:type/:id', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), updateRequestStatus);

// User Management - Admin Only
router.put('/users/:id/status', protect, authorize('ADMIN'), updateUserStatus);
router.put('/users/:id', protect, authorize('ADMIN'), updateEmployee);
router.delete('/users/:id', protect, authorize('ADMIN'), deleteEmployee);

module.exports = router;
