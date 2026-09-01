const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { protectDevice } = require('../controllers/callSyncController');
const {
  recordLocation,
  getLiveLocations,
  getLocationHistory
} = require('../controllers/locationController');

const router = express.Router();

// Middleware to support both Device Token (APK) and Bearer Token (Web)
const protectDeviceOrUser = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (/^Device\s+/i.test(authHeader)) {
    return protectDevice(req, res, next);
  }
  return protect(req, res, next);
};

// AE mobile ping endpoint (supports both APK Device token & User Bearer token)
router.post('/ping', protectDeviceOrUser, recordLocation);

// Live tracker overview for Admin, BH, AE Manager, HR
router.get('/live', protect, authorize('ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER', 'HR'), getLiveLocations);

// Historical route trace for Admin, BH, AE Manager, HR
router.get('/history/:userId', protect, authorize('ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER', 'HR'), getLocationHistory);

module.exports = router;
