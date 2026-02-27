const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { OAuth2Client } = require('google-auth-library');

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            if (user.status === 'BLOCKED') {
                return res.status(403).json({
                    message: 'Account Blocked. You have been absent for 3+ days without approval. Contact HR.',
                    name: user.name
                });
            }

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                designation: user.designation,
                reportingBhId: user.reportingBhId,
                isGlobalAccess: user.isGlobalAccess,
                wfhViewEnabled: user.wfhViewEnabled,
                token: generateToken(user.id, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Register a new user (for seeding/admin usage)
// @route   POST /api/auth/register
// @access  Public (or Admin only later)
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const userExists = await prisma.user.findUnique({
            where: { email },
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'EMPLOYEE',
            },
        });

        if (user) {
            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                wfhViewEnabled: user.wfhViewEnabled,
                token: generateToken(user.id, user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    const user = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        designation: req.user.designation,
        reportingBhId: req.user.reportingBhId,
        isGlobalAccess: req.user.isGlobalAccess,
        wfhViewEnabled: req.user.wfhViewEnabled,
    };
    res.json(user);
};

// @desc    Login with Google
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { email, name, picture } = ticket.getPayload();

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user) {
            // User exists, log them in
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                designation: user.designation,
                reportingBhId: user.reportingBhId,
                wfhViewEnabled: user.wfhViewEnabled,
                token: generateToken(user.id),
            });
        } else {
            // Option: Auto-register OR Return Error. 
            // For corporate apps, usually safer to return error if not pre-registered.
            res.status(401).json({ message: 'Email not registered. Please contact Admin.' });

            /* Auto-Register Code (Commented out for safety)
            const newUser = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: bcrypt.hashSync(Math.random().toString(36).slice(-8), 10), // Random password
                    role: 'EMPLOYEE',
                    designation: 'PENDING'
                }
            });
            res.status(201).json({ ...newUser, token: generateToken(newUser.id) });
            */
        }
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google Token' });
    }
};

module.exports = {
    loginUser,
    registerUser,
    getMe,
    googleLogin
};
