const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Mark attendance for today
// @route   POST /api/attendance
// @access  Private (Employee)
const markAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if running on Sunday (optional: can be configured)
        // if (today.getDay() === 0) { ... }

        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: {
                    gte: today, // Greater than or equal to start of today
                },
            },
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for today' });
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                status: 'PRESENT',
                date: new Date(), // Storing exact time as well, but queried by day
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
const checkoutAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: { gte: today },
            },
        });

        if (!attendance) {
            return res.status(400).json({ message: 'No attendance record found for today' });
        }

        if (attendance.checkoutTime) {
            return res.status(400).json({ message: 'Already checked out' });
        }

        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: { checkoutTime: new Date() },
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
        });

        res.json({ marked: !!attendance, data: attendance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { markAttendance, checkoutAttendance, getAttendanceStatus };
