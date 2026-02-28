const express = require('express');
const router = express.Router();
const {
    createWfhRequest,
    getManageableWfhRequests,
    getMyWfhRequests,
    approveWfhRequest,
    getWfhHistory
} = require('../controllers/wfhController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, createWfhRequest);

router.route('/me')
    .get(protect, getMyWfhRequests);

router.route('/manage')
    .get(protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), getManageableWfhRequests);

router.route('/history')
    .get(protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), getWfhHistory);

router.route('/:id/approve')
    .put(protect, authorize('ADMIN', 'HR', 'BUSINESS_HEAD'), approveWfhRequest);

module.exports = router;
