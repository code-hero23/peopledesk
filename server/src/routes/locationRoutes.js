const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  recordLocation,
  getLiveLocations,
  getLocationHistory
} = require('../controllers/locationController');

const router = express.Router();

// AE mobile ping endpoint
router.post('/ping', protect, recordLocation);

// Live tracker overview for Admin, BH, AE Manager, HR
router.get('/live', protect, authorize('ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER', 'HR'), getLiveLocations);

// Historical route trace for Admin, BH, AE Manager, HR
router.get('/history/:userId', protect, authorize('ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER', 'HR'), getLocationHistory);

module.exports = router;
