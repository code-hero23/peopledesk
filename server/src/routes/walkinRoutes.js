const express = require('express');
const router = express.Router();
const {
    getAllWalkinEntries,
    createWalkinEntry,
    updateWalkinEntry,
    deleteWalkinEntry,
    getAllBHs,
    getStaffMembers
} = require('../controllers/walkinController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getAllWalkinEntries);
router.post('/', createWalkinEntry);
router.get('/bhs', getAllBHs);
router.get('/staff', getStaffMembers);

router.route('/:id')
    .put(updateWalkinEntry)
    .delete(authorize('ADMIN', 'BUSINESS_HEAD'), deleteWalkinEntry);

module.exports = router;
