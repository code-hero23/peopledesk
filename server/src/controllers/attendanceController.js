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

        if (req.file) {
            console.log('File uploaded successfully:', req.file);
        } else {
            console.warn('No file received for check-in');
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

        if (req.file) {
            console.log('Checkout file uploaded successfully:', req.file);
        } else {
            console.warn('No file received for check-out');
        }

        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkoutTime: new Date(),
                checkoutPhoto: req.file ? `/uploads/${req.file.filename}` : null,
                checkoutDeviceInfo: req.body.deviceInfo || req.headers['user-agent'],
                checkoutIpAddress: req.ip || req.connection.remoteAddress
            },
        });

        res.json(updatedAttendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Pause attendance (Take a break)
// @route   POST /api/attendance/pause
// @access  Private
const pauseAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { breakType } = req.body; // TEA, LUNCH, CLIENT_MEETING, BH_MEETING
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find active attendance
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: { gte: today },
                checkoutTime: null // Must be checked in
            },
            orderBy: { date: 'desc' },
            include: { breaks: true }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'No active attendance found or already checked out.' });
        }

        // Check if already paused
        const activeBreak = attendance.breaks.find(b => !b.endTime);
        if (activeBreak) {
            return res.status(400).json({ message: 'You are already on a break.' });
        }

        // Create new break log
        const newBreak = await prisma.breakLog.create({
            data: {
                attendanceId: attendance.id,
                breakType: breakType,
                startTime: new Date()
            }
        });

        res.json({ message: 'Attendance paused', break: newBreak });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Resume attendance (End break)
// @route   POST /api/attendance/resume
// @access  Private
const resumeAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find active attendance
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: { gte: today },
                checkoutTime: null
            },
            orderBy: { date: 'desc' },
            include: { breaks: true }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'No active attendance found.' });
        }

        // Find active break
        const activeBreak = attendance.breaks.find(b => !b.endTime);
        if (!activeBreak) {
            return res.status(400).json({ message: 'You are not currently on a break.' });
        }

        // Calculate duration (minutes)
        const endTime = new Date();
        const startTime = new Date(activeBreak.startTime);
        const duration = Math.round((endTime - startTime) / 60000); // Minutes

        const updatedBreak = await prisma.breakLog.update({
            where: { id: activeBreak.id },
            data: {
                endTime: endTime,
                duration: duration
            }
        });

        res.json({ message: 'Attendance resumed', break: updatedBreak });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

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
            },
            include: {
                breaks: true // Include breaks to check status
            }
        });

        // Determine pause status
        let isPaused = false;
        let activeBreak = null;
        if (attendance && attendance.breaks) {
            activeBreak = attendance.breaks.find(b => !b.endTime);
            if (activeBreak) isPaused = true;
        }

        res.json({
            marked: !!attendance,
            data: attendance,
            isPaused,
            activeBreak
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { markAttendance, checkoutAttendance, getAttendanceStatus, pauseAttendance, resumeAttendance };
