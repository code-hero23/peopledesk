const express = require('express');
const router = express.Router();
const { 
    getCarpenterRecords, 
    createCarpenterRecord, 
    updateCarpenterRecord, 
    deleteCarpenterRecord,
    exportCarpenterRecords
} = require('../controllers/carpenterController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/export', exportCarpenterRecords);

router.route('/')
    .get(getCarpenterRecords)
    .post(createCarpenterRecord);

router.route('/:id')
    .put(updateCarpenterRecord)
    .delete(deleteCarpenterRecord);

module.exports = router;
