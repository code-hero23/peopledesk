const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
    getSeatingLayout,
    assignSeat,
    releaseSeat,
    updateSeatStatusByAdmin
} = require('../controllers/seatingController');

router.get('/layout', protect, getSeatingLayout);
router.post('/assign', protect, assignSeat);
router.post('/release', protect, releaseSeat);
router.put('/update-status', protect, updateSeatStatusByAdmin);

module.exports = router;
