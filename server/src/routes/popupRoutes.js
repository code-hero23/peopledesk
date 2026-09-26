const express = require('express');
const router = express.Router();
const popupController = require('../controllers/popupController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists (use absolute path for consistency)
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `popup-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'image/gif';

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Images only! Allowed: PNG, JPG, WEBP, GIF'));
        }
    }
});

router.get('/', protect, popupController.getPopupConfig);
router.post('/', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), popupController.updatePopupConfig);

// Dedicated route for image upload with explicit error handling
router.post('/upload', protect, authorize('ADMIN', 'BUSINESS_HEAD', 'HR'), (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message || 'Error uploading file' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'Please select an image file to upload' });
        }
        // Return /api/uploads path which works through both direct and proxy setups
        const imageUrl = `/api/uploads/${req.file.filename}`;
        res.status(200).json({ imageUrl });
    });
});

module.exports = router;

