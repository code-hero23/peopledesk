const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const initAttendanceCron = require('./cron/attendanceCron');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const workLogRoutes = require('./routes/workLogRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Initialize Cron Jobs
initAttendanceCron();

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com"],
            connectSrc: ["'self'", "https://accounts.google.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: "cross-origin" },
})); // Set security headers

// Hardened CORS
const corsOptions = {
    origin: process.env.CLIENT_URL || '*', // In production, replace '*' with your actual frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));

// Global Rate Limiting - Increased to 2000 for unrestricted development
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Limit each IP to 2000 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', globalLimiter);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/worklogs', workLogRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/popup', require('./routes/popupRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Cookscape WorkSphere API' }); // Server Restart Triggered v2
});

module.exports = app;