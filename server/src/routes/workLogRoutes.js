const express = require('express');
const router = express.Router();
const {
    createWorkLog,
    getMyWorkLogs,
    closeWorkLog,
    addProjectReport,
    syncCallLogs,
    getAllCallStats
} = require('../controllers/workLogController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const { upload } = require('../middlewares/uploadMiddleware');

router.post('/', protect, upload.array('ae_photos', 5), createWorkLog);
router.put('/close', protect, upload.array('ae_photos', 5), closeWorkLog);
router.put('/project-report', protect, upload.array('ae_photos', 5), addProjectReport);
router.put('/sync-calls', protect, syncCallLogs);
router.get('/call-stats', protect, authorize(['ADMIN', 'HR']), getAllCallStats); // Admin/HR endpoint
router.get('/', protect, getMyWorkLogs);

module.exports = router;
