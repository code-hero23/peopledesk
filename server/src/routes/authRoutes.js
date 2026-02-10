const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { loginUser, registerUser, getMe, googleLogin } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Rate limiting for login/register - increased significantly for thorough testing
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // Increased to 100
    message: 'Too many login/registration attempts, please try again after 5 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware to handle validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation rules
const loginValidation = [
    body('email').isEmail().withMessage('Enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
];

const registerValidation = [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Enter a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    validate
];

router.post('/login', authLimiter, loginValidation, loginUser);
router.post('/register', authLimiter, registerValidation, registerUser);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);

module.exports = router;
