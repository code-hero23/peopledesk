const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { subscribe, unsubscribe } = require('../controllers/notificationController');

router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);

module.exports = router;
