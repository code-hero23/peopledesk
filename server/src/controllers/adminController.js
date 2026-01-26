const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// @desc    Get all employees
// @route   GET /api/admin/employees
// @access  Private (Admin)
const getAllEmployees = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                lastWorkLogDate: true,
            },
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all pending requests (Leave & Permission)
// @route   GET /api/admin/requests/pending
// @access  Private (Admin)
const getAllPendingRequests = async (req, res) => {
    try {
        const leaves = await prisma.leaveRequest.findMany({
            where: { status: 'PENDING' },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'asc' },
        });

        const permissions = await prisma.permissionRequest.findMany({
            where: { status: 'PENDING' },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ leaves, permissions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get request history (Approved/Rejected)
// @route   GET /api/admin/requests/history
// @access  Private (Admin)
const getRequestHistory = async (req, res) => {
    try {
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                status: {
                    in: ['APPROVED', 'REJECTED']
                }
            },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 50 // Limit to last 50
        });

        const permissions = await prisma.permissionRequest.findMany({
            where: {
                status: {
                    in: ['APPROVED', 'REJECTED']
                }
            },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 50 // Limit to last 50
        });

        res.json({ leaves, permissions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update request status (Approve/Reject)
// @route   PUT /api/admin/requests/:type/:id
// @access  Private (Admin)
const updateRequestStatus = async (req, res) => {
    const { type, id } = req.params; // type: 'leave' or 'permission'
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        let result;
        const adminId = req.user.id; // Who approved/rejected it

        if (type === 'leave') {
            result = await prisma.leaveRequest.update({
                where: { id: parseInt(id) },
                data: { status, approvedBy: adminId },
            });
        } else if (type === 'permission') {
            result = await prisma.permissionRequest.update({
                where: { id: parseInt(id) },
                data: { status, approvedBy: adminId },
            });
        } else {
            return res.status(400).json({ message: 'Invalid request type' });
        }

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Block or Unblock a user
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'BLOCKED'

    if (!['ACTIVE', 'BLOCKED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status },
            select: { id: true, name: true, email: true, status: true }
        });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create new employee
// @route   POST /api/admin/employees
// @access  Private (Admin)
const createEmployee = async (req, res) => {
    const { name, email, password, designation } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    try {
        // Check if user exists
        const userExists = await prisma.user.findUnique({
            where: { email },
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'EMPLOYEE',
                designation: designation || 'LA', // Default to LA
            },
            select: { id: true, name: true, email: true, role: true, designation: true, status: true },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all work logs
// @route   GET /api/admin/worklogs
// @access  Private (Admin)
const getAllWorkLogs = async (req, res) => {
    try {
        const logs = await prisma.workLog.findMany({
            include: { user: { select: { name: true, email: true } } },
            orderBy: { date: 'desc' },
        });
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get daily work log report (Submitted/Pending for all users)
// @route   GET /api/admin/worklogs/daily
// @access  Private (Admin)
const getDailyWorkLogs = async (req, res) => {
    try {
        const { date } = req.query;

        // Parse date or use today (start of day)
        const queryDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

        // 1. Get all active users
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE', role: 'EMPLOYEE' },
            select: { id: true, name: true, email: true, designation: true }
        });

        // 2. Get work logs for the date
        const logs = await prisma.workLog.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // 3. Merge data
        const dailyReport = users.map(user => {
            const log = logs.find(l => l.userId === user.id);
            return {
                user: user,
                status: log ? 'SUBMITTED' : 'PENDING',
                workLog: log || null
            };
        });

        res.json(dailyReport);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all attendance records
// @route   GET /api/admin/attendance
// @access  Private (Admin)
const getAllAttendance = async (req, res) => {
    try {
        const attendance = await prisma.attendance.findMany({
            include: { user: { select: { name: true, email: true } } },
            orderBy: { date: 'desc' },
            take: 100, // Limit to last 100 for now, or implement pagination
        });
        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get daily attendance report (Present/Absent for all users)
// @route   GET /api/admin/attendance/daily
// @access  Private (Admin)
const getDailyAttendance = async (req, res) => {
    try {
        const { date } = req.query;

        // Parse date or use today (start of day)
        const queryDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

        // 1. Get all active users
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE', role: 'EMPLOYEE' },
            select: { id: true, name: true, email: true, designation: true }
        });

        // 2. Get attendance for the date
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // 3. Merge data
        const dailyReport = users.map(user => {
            const record = attendanceRecords.find(a => a.userId === user.id);
            return {
                user: user,
                status: record ? 'PRESENT' : 'ABSENT',
                timeIn: record ? record.date : null,
                attendanceId: record ? record.id : null
            };
        });

        res.json(dailyReport);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Update employee details
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { name, email, designation, role } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                designation,
                role: role || undefined // Only update role if provided
            },
            select: { id: true, name: true, email: true, role: true, designation: true, status: true }
        });
        res.json(user);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete employee and related data
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteEmployee = async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id);

    try {
        // Use transaction to delete all related data first
        await prisma.$transaction([
            prisma.workLog.deleteMany({ where: { userId } }),
            prisma.attendance.deleteMany({ where: { userId } }),
            prisma.leaveRequest.deleteMany({ where: { userId } }),
            prisma.permissionRequest.deleteMany({ where: { userId } }),
            prisma.loginAccessRequest.deleteMany({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } })
        ]);

        res.json({ message: 'Employee removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getAllEmployees,
    getAllPendingRequests,
    getRequestHistory,
    updateRequestStatus,
    updateUserStatus,
    createEmployee,
    getAllWorkLogs,
    getDailyWorkLogs,
    getAllAttendance,
    getDailyAttendance,
    updateEmployee,
    deleteEmployee
};
