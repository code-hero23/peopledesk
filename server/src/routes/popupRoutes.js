const express = require('express');
const router = express.Router();
const popupController = require('../controllers/popupController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for PNG uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `popup-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: PNG Images Only!');
        }
    }
});

router.get('/', protect, popupController.getPopupConfig);
router.post('/', protect, authorize('ADMIN'), popupController.updatePopupConfig);

// Dedicated route for image upload
router.post('/upload', protect, authorize('ADMIN'), upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Please upload a file' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
});

module.exports = router;
