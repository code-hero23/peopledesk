const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Set storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: fieldname-timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Check excel type
function checkExcelType(file, cb) {
    const filetypes = /xlsx|xls|csv/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // MIME type check can be unreliable for Excel, trusting extension
    if (extname) {
        return cb(null, true);
    } else {
        cb('Error: Excel or CSV files only!');
    }
}

// Init upload image
const upload = multer({
    storage: storage,
    limits: { fileSize: 15000000 }, // 15MB limit
    fileFilter: function (req, file, cb) {
        console.log('Multer fileFilter evaluating file:', file.originalname, file.mimetype);
        checkFileType(file, cb);
    }
});

// Init upload excel
const uploadExcel = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        checkExcelType(file, cb);
    }
});

module.exports = { upload, uploadExcel };
