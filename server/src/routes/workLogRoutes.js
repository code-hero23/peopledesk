const express = require('express');
const router = express.Router();
const { createWorkLog, getMyWorkLogs } = require('../controllers/workLogController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, createWorkLog);
router.get('/', protect, getMyWorkLogs);

module.exports = router;
