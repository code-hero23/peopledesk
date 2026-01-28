const express = require('express');
const router = express.Router();
const { createLeaveRequest, createPermissionRequest, getMyRequests, getBusinessHeads } = require('../controllers/requestController');
const { protect } = require('../middlewares/authMiddleware');

// Route to get list of Business Heads
router.get('/business-heads', protect, getBusinessHeads);

router.post('/leave', protect, createLeaveRequest);
router.post('/permission', protect, createPermissionRequest);
router.get('/', protect, getMyRequests);

module.exports = router;
