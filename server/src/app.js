const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const initAttendanceCron = require('./cron/attendanceCron');
const initCheckoutReminderCron = require('./cron/checkoutReminderCron');
const initNotificationCron = require('./cron/notificationCron');
const initFinanceCron = require('./cron/financeCron');
const initWorklogReminderCron = require('./cron/worklogReminderCron');
const initBreakExceedanceCron = require('./cron/breakExceedanceCron');


// Route Imports
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const workLogRoutes = require('./routes/workLogRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Initialize Cron Jobs
initAttendanceCron();
initCheckoutReminderCron();
initNotificationCron();
initFinanceCron();
// initWorklogReminderCron();
// initBreakExceedanceCron();


// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com"],
            connectSrc: ["*"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: "cross-origin" },
})); // Set security headers

// Multi-origin CORS for development and mobile
const corsOptions = {
    origin: true, // Reflect request origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // Set to false since we use Bearer tokens, makes wildcard/reflecting easier
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
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/wfh', require('./routes/wfhRoutes'));
app.use('/api/vouchers', require('./routes/voucherRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/carpenter', require('./routes/carpenterRoutes'));
app.use('/api/walkin', require('./routes/walkinRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));

app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to PeopleDesk API', status: 'Running' });
});


app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Cookscape WorkSphere API' }); // Server Restart Triggered v4 (Bug Fixed)
});

// Error Handlers
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    console.error('SERVER ERROR:', err);
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🍰' : err.stack,
    });
};

app.use(notFound);
app.use(errorHandler);

module.exports = app;