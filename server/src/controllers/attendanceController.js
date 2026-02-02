const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Mark attendance for today
// @route   POST /api/attendance
// @access  Private (Employee)
// @desc    Mark attendance for today
// @route   POST /api/attendance
// @access  Private (Employee)
const markAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch ALL attendance records for today
        const existingAttendances = await prisma.attendance.findMany({
            where: {
                userId,
                date: {
                    gte: today,
                },
            },
            orderBy: {
                date: 'desc' // Latest first
            }
        });

        // Current User Logic
        const isAE = req.user.designation === 'AE';
        const latestAttendance = existingAttendances[0];

        // Validations
        if (latestAttendance) {
            // If the latest record is still active (no checkout), cannot create new one
            if (!latestAttendance.checkoutTime) {
                return res.status(400).json({ message: 'You are already checked in. Please check out first.' });
            }

            // If checked out, proceed based on role
            if (!isAE) {
                // Non-AE users can only have ONE record per day
                return res.status(400).json({ message: 'Attendance already marked for today' });
            }
            // If AE, and checked out, ALLOW creating new record (Fall through)
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                status: 'PRESENT',
                date: new Date(),
                checkInPhoto: req.file ? `/uploads/${req.file.filename}` : null,
                deviceInfo: req.body.deviceInfo || req.headers['user-agent'],
                ipAddress: req.ip || req.connection.remoteAddress
            },
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Checkout for today
// @route   PUT /api/attendance/checkout
// @access  Private (Employee)
// @desc    Checkout for today
// @route   PUT /api/attendance/checkout
// @access  Private (Employee)
const checkoutAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the LATEST attendance record for today
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: { gte: today },
            },
            orderBy: {
                date: 'desc'
            }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'No attendance record found for today' });
        }

        if (attendance.checkoutTime) {
            return res.status(400).json({ message: 'Already checked out' });
        }

        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkoutTime: new Date(),
                checkoutPhoto: req.file ? `/uploads/${req.file.filename}` : null
            },
        });

        res.json(updatedAttendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Check if attendance is marked for today
// @route   GET /api/attendance/today
// @access  Private
// @desc    Check if attendance is marked for today
// @route   GET /api/attendance/today
// @access  Private
const getAttendanceStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                },
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.json({ marked: !!attendance, data: attendance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { markAttendance, checkoutAttendance, getAttendanceStatus };
