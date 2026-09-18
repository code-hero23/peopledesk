const express = require('express');
const router = express.Router();
const { getSettings, updateSetting } = require('../controllers/settingsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .get(protect, getSettings)
    .post(protect, (req, res, next) => {
        if (req.user?.role === 'ANALYZER' && req.body?.key === 'EXCLUDED_EMPLOYEE_NUMBERS') {
            return next();
        }
        return authorize('ADMIN')(req, res, next);
    }, updateSetting);

module.exports = router;
