const express = require('express');
const router = express.Router();
const { createLeaveRequest, createPermissionRequest, getMyRequests } = require('../controllers/requestController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/leave', protect, createLeaveRequest);
router.post('/permission', protect, createPermissionRequest);
router.get('/', protect, getMyRequests);

module.exports = router;
