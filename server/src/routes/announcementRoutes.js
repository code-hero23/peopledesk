const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getAnnouncements);

router.post('/', authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), createAnnouncement);
router.put('/:id', authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), updateAnnouncement);
router.delete('/:id', authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), deleteAnnouncement);

module.exports = router;
