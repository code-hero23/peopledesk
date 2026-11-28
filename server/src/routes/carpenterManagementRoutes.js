const express = require('express');
const router = express.Router();
const {
    getAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    addDailyWorkLog,
    deleteDailyWorkLog,
    getStats
} = require('../controllers/carpenterManagementController');
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.use(protect);

router.get('/stats', getStats);

router.route('/assignments')
    .get(getAssignments)
    .post(createAssignment);

router.route('/assignments/:id')
    .get(getAssignmentById)
    .put(updateAssignment)
    .delete(deleteAssignment);

router.post('/assignments/:id/daily-logs', upload.array('photos', 20), addDailyWorkLog);
router.delete('/daily-logs/:logId', deleteDailyWorkLog);

module.exports = router;
