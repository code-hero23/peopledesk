const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { syncCallLogs } = require('../controllers/workLogController');
const { createActivationCode, enrollDevice, getSyncStatus, protectDevice, recordDeviceAttempt } = require('../controllers/callSyncController');

const router = express.Router();
router.post('/activation-codes', protect, createActivationCode);
router.get('/status', protect, getSyncStatus);
router.post('/enroll', enrollDevice);
router.put('/sync', protectDevice, recordDeviceAttempt, (req, res, next) => {
  req.body.simFilter = req.callSyncDevice.officialSim;
  syncCallLogs(req, res, next);
});
module.exports = router;
