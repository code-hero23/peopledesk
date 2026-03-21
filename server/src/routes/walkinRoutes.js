const express = require('express');
const router = express.Router();
const {
    getAllWalkinEntries,
    createWalkinEntry,
    updateWalkinEntry,
    deleteWalkinEntry,
    getAllBHs
} = require('../controllers/walkinController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getAllWalkinEntries);
router.post('/', createWalkinEntry);
router.get('/bhs', getAllBHs);

router.route('/:id')
    .put(updateWalkinEntry)
    .delete(authorize('ADMIN'), deleteWalkinEntry);

module.exports = router;
