const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getMe, googleLogin } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);

module.exports = router;
