const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { loginUser, registerUser, getMe, googleLogin } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Rate limiting for login/register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Generous ceiling per client IP
    skipSuccessfulRequests: true, // Never penalize successful logins!
    message: { message: 'Too many failed login attempts, please try again after 15 minutes' },
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
