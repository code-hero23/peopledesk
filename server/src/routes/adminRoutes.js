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
    deleteEmployee
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/employees', protect, authorize('ADMIN'), getAllEmployees);
router.post('/employees', protect, authorize('ADMIN'), createEmployee);
router.get('/worklogs', protect, authorize('ADMIN'), getAllWorkLogs);
router.get('/worklogs/daily', protect, authorize('ADMIN'), getDailyWorkLogs);
router.get('/attendance', protect, authorize('ADMIN'), getAllAttendance);
router.get('/attendance/daily', protect, authorize('ADMIN'), getDailyAttendance);
router.get('/requests/pending', protect, authorize('ADMIN'), getAllPendingRequests);
router.get('/requests/history', protect, authorize('ADMIN'), getRequestHistory);
router.put('/requests/:type/:id', protect, authorize('ADMIN'), updateRequestStatus);
router.put('/users/:id/status', protect, authorize('ADMIN'), updateUserStatus);
router.put('/users/:id', protect, authorize('ADMIN'), updateEmployee);
router.delete('/users/:id', protect, authorize('ADMIN'), deleteEmployee);

module.exports = router;
