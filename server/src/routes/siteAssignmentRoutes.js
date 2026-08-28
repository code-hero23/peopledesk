const express = require('express');
const router = express.Router();
const {
    getAEList,
    createAssignment,
    getAssignments,
    getAssignmentById,
    updateAssignment,
    deleteAssignment,
    bulkImportAssignments,
    exportAssignments
} = require('../controllers/siteAssignmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { uploadExcel } = require('../middlewares/uploadMiddleware');

// Get AE Dropdown list
router.get('/ae-list', protect, getAEList);

// Export to Excel / CSV
router.get('/export', protect, exportAssignments);

// Get list of assignments with search, filter, pagination
router.get('/', protect, getAssignments);

// Get single assignment
router.get('/:id', protect, getAssignmentById);

// Create assignment (Managers / Admins)
router.post(
    '/',
    protect,
    authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER', 'ACCOUNTS_MANAGER'),
    createAssignment
);

// Bulk import from Excel / CSV
router.post(
    '/import',
    protect,
    authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER', 'ACCOUNTS_MANAGER'),
    uploadExcel.single('file'),
    bulkImportAssignments
);

// Update assignment / status
router.put('/:id', protect, updateAssignment);

// Delete assignment (Managers / Admins)
router.delete(
    '/:id',
    protect,
    authorize('ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER', 'ACCOUNTS_MANAGER'),
    deleteAssignment
);

module.exports = router;
