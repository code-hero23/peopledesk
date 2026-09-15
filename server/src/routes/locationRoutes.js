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

// Permission check for viewing live tracker
const canViewLive = (req, res, next) => {
  const role = (req.user?.role || '').toUpperCase();
  const designation = (req.user?.designation || '').toUpperCase();
  const isAuthorized = [
    'ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER', 'HR'
  ].includes(role) || designation.includes('AE') || designation.includes('AREA EXECUTIVE');

  if (isAuthorized) {
    return next();
  }
  return res.status(403).json({ message: 'Not authorized to view live tracking' });
};

// Permission check for viewing historical route
const canViewHistory = (req, res, next) => {
  const targetUserId = Number(req.params.userId);
  const currentUserId = Number(req.user?.id);
  const role = (req.user?.role || '').toUpperCase();
  const isManager = ['ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER', 'HR'].includes(role);

  if (isManager || targetUserId === currentUserId) {
    return next();
  }
  return res.status(403).json({ message: 'Not authorized to view this location history' });
};

// AE mobile ping endpoint (supports both APK Device token & User Bearer token)
router.post('/ping', protectDeviceOrUser, recordLocation);

// Live tracker overview for Admin, BH, AE Manager, HR, and AEs
router.get('/live', protect, canViewLive, getLiveLocations);

// Historical route trace for Admin, BH, AE Manager, HR, and AE for their own history
router.get('/history/:userId', protect, canViewHistory, getLocationHistory);

module.exports = router;
