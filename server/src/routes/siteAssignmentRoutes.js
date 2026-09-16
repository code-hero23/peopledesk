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
    exportAssignments,
    fetchRemoteXls,
    getMyAssignments
} = require('../controllers/siteAssignmentController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadExcel } = require('../middlewares/uploadMiddleware');

// Middleware ensuring AE Manager, Admin, and Business Head can assign/manage sites
const authorizeAEManager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const role = (req.user.role || '').toUpperCase();
    const designation = (req.user.designation || '').toUpperCase();

    if (
        ['ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER', 'AR_MANAGER'].includes(role) ||
        ['AE MANAGER', 'AE_MANAGER', 'AR MANAGER', 'AR_MANAGER', 'ADMIN', 'BUSINESS HEAD'].includes(designation) ||
        designation.includes('AE MANAGER') ||
        designation.includes('AR MANAGER')
    ) {
        return next();
    }

    return res.status(403).json({ message: 'Access denied. Only AE Manager, Admin, or Business Head can manage site allocations.' });
};

// Get assigned sites for current logged-in employee (Dropdown)
router.get('/my-sites', protect, getMyAssignments);

// Get AE Dropdown list
router.get('/ae-list', protect, getAEList);

// Export to Excel / CSV
router.get('/export', protect, exportAssignments);

// Fetch remote spreadsheet from URL / Google Sheets link
router.post('/fetch-remote-xls', protect, fetchRemoteXls);

// Get list of assignments with search, filter, pagination
router.get('/', protect, getAssignments);

// Get single assignment
router.get('/:id', protect, getAssignmentById);

// Create assignment (ONLY AE Manager)
router.post(
    '/',
    protect,
    authorizeAEManager,
    createAssignment
);

// Bulk import from Excel / CSV (ONLY AE Manager)
router.post(
    '/import',
    protect,
    authorizeAEManager,
    uploadExcel.single('file'),
    bulkImportAssignments
);

// Update assignment (ONLY AE Manager)
router.put('/:id', protect, authorizeAEManager, updateAssignment);

// Delete assignment (ONLY AE Manager)
router.delete(
    '/:id',
    protect,
    authorizeAEManager,
    deleteAssignment
);

module.exports = router;
