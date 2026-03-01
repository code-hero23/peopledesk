const express = require('express');
const router = express.Router();
const { getSettings, updateSetting } = require('../controllers/settingsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .get(protect, getSettings)
    .post(protect, authorize('ADMIN'), updateSetting);

module.exports = router;
