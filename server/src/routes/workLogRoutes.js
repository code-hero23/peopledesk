const express = require('express');
const router = express.Router();
const { createWorkLog, getMyWorkLogs } = require('../controllers/workLogController');
const { protect } = require('../middlewares/authMiddleware');

const { upload } = require('../middlewares/uploadMiddleware');

router.post('/', protect, upload.array('ae_photos', 5), createWorkLog);
router.get('/', protect, getMyWorkLogs);

module.exports = router;
