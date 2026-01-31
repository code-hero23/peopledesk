const express = require('express');
const router = express.Router();
const { createWorkLog, getMyWorkLogs, closeWorkLog, addProjectReport } = require('../controllers/workLogController');
const { protect } = require('../middlewares/authMiddleware');

const { upload } = require('../middlewares/uploadMiddleware');

router.post('/', protect, upload.array('ae_photos', 5), createWorkLog);
router.put('/close', protect, upload.array('ae_photos', 5), closeWorkLog);
router.put('/project-report', protect, addProjectReport);
router.get('/', protect, getMyWorkLogs);

module.exports = router;
