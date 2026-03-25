const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, clearAllNotifications } = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.delete('/', clearAllNotifications);

module.exports = router;
