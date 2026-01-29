const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
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
                designation: true,
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
// @access  Private (Admin, BH, HR)
const getAllPendingRequests = async (req, res) => {
    try {
        const userRole = req.user.role;

        // Base query conditions
        let leaveWhere = {};
        let permissionWhere = {};

        if (userRole === 'BUSINESS_HEAD') {
            // BH sees requests where targetBhId is theirs OR null (legacy/fallback)
            // AND status is pending
            const userId = req.user.id;

            leaveWhere = {
                bhStatus: 'PENDING',
                status: 'PENDING',
                OR: [
                    { targetBhId: userId },
                    { targetBhId: null }
                ]
            };
            permissionWhere = {
                bhStatus: 'PENDING',
                status: 'PENDING',
                OR: [
                    { targetBhId: userId },
                    { targetBhId: null }
                ]
            };
        } else if (userRole === 'HR') {
            // HR sees requests that are APPROVED by BH but PENDING HR
            leaveWhere = { bhStatus: 'APPROVED', hrStatus: 'PENDING' };
            permissionWhere = { bhStatus: 'APPROVED', hrStatus: 'PENDING' };
        } else if (userRole === 'ADMIN') {
            // Admin sees EVERYTHING pending at any stage
            leaveWhere = { status: 'PENDING' }; // Show all pending overall
            permissionWhere = { status: 'PENDING' };
        } else {
            // Regular employees/Managers shouldn't be here usually, or see nothing
            return res.json({ leaves: [], permissions: [] });
        }

        const leavesRaw = await prisma.leaveRequest.findMany({
            where: leaveWhere,
            include: { user: { select: { name: true, email: true, designation: true } } },
            orderBy: { createdAt: 'asc' },
        });

        const permissionsRaw = await prisma.permissionRequest.findMany({
            where: permissionWhere,
            include: { user: { select: { name: true, email: true, designation: true } } },
            orderBy: { createdAt: 'asc' },
        });

        // Enrich with BH Name
        const leaveBhIds = [...new Set(leavesRaw.map(r => r.bhId).filter(id => id))];
        const permissionBhIds = [...new Set(permissionsRaw.map(r => r.bhId).filter(id => id))];
        const allBhIds = [...new Set([...leaveBhIds, ...permissionBhIds])];

        let bhMap = {};
        if (allBhIds.length > 0) {
            const bhUsers = await prisma.user.findMany({
                where: { id: { in: allBhIds } },
                select: { id: true, name: true }
            });
            bhUsers.forEach(u => bhMap[u.id] = u.name);
        }

        const enrichWithBhName = (req) => ({
            ...req,
            bhName: req.bhId ? bhMap[req.bhId] : null
        });

        const leaves = leavesRaw.map(enrichWithBhName);
        const permissions = permissionsRaw.map(enrichWithBhName);

        res.json({ leaves, permissions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get request history (Approved/Rejected)
// @route   GET /api/admin/requests/history
// @access  Private (Admin, BH, HR)
const getRequestHistory = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;

        let leaveWhere = {};
        let permissionWhere = {};

        if (userRole === 'BUSINESS_HEAD') {
            // BH sees requests they have acted on (bhStatus is NOT pending)
            // They should see it even if overall status is pending (waiting for HR)
            console.log(`BH History Query for ${userId} (BH)`);
            leaveWhere = {
                bhStatus: { not: 'PENDING' },
                OR: [
                    { targetBhId: userId },
                    { bhId: userId }
                ]
            };
            permissionWhere = {
                bhStatus: { not: 'PENDING' },
                OR: [
                    { targetBhId: userId },
                    { bhId: userId }
                ]
            };
        } else if (userRole === 'HR') {
            console.log(`HR History Query for ${userId} (HR)`);
            // SIMPLIFIED HR Logic: HR sees EVERYTHING that is finalized (APPROVED/REJECTED)
            // This acts as the company-wide record.
            leaveWhere = { status: { in: ['APPROVED', 'REJECTED'] } };
            permissionWhere = { status: { in: ['APPROVED', 'REJECTED'] } };

        } else {
            console.log(`History Query for ${userRole}`);
            // Admin sees all finalized requests
            leaveWhere = { status: { in: ['APPROVED', 'REJECTED'] } };
            permissionWhere = { status: { in: ['APPROVED', 'REJECTED'] } };
        }

        console.log("Leave Where Clause:", JSON.stringify(leaveWhere, null, 2));

        const leavesRaw = await prisma.leaveRequest.findMany({
            where: leaveWhere,
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const permissionsRaw = await prisma.permissionRequest.findMany({
            where: permissionWhere,
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Enrich with BH Name
        const leaveBhIds = [...new Set(leavesRaw.map(r => r.bhId).filter(id => id))];
        const permissionBhIds = [...new Set(permissionsRaw.map(r => r.bhId).filter(id => id))];
        const allBhIds = [...new Set([...leaveBhIds, ...permissionBhIds])];

        let bhMap = {};
        if (allBhIds.length > 0) {
            const bhUsers = await prisma.user.findMany({
                where: { id: { in: allBhIds } },
                select: { id: true, name: true }
            });
            bhUsers.forEach(u => bhMap[u.id] = u.name);
        }

        const enrichWithBhName = (req) => ({
            ...req,
            bhName: req.bhId ? bhMap[req.bhId] : null
        });

        const leaves = leavesRaw.map(enrichWithBhName);
        const permissions = permissionsRaw.map(enrichWithBhName);

        res.json({ leaves, permissions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
const updateRequestStatus = async (req, res) => {
    const { type, id } = req.params; // type: 'leave' or 'permission'
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        let result;
        const model = type === 'leave' ? prisma.leaveRequest : prisma.permissionRequest;

        // Construct update data based on Role
        let updateData = {};

        if (userRole === 'BUSINESS_HEAD') {
            updateData.bhStatus = status;
            updateData.bhId = userId;

            // If Rejected by BH, reject overall
            if (status === 'REJECTED') {
                updateData.status = 'REJECTED';
            }
            // If Approved by BH, overall remains PENDING (waiting for HR)
        }
        else if (userRole === 'HR') {
            updateData.hrStatus = status;
            updateData.hrId = userId;

            // HR is final authority - Update Overall Status
            updateData.status = status;
            updateData.approvedBy = userId; // Legacy support
        }
        else if (userRole === 'ADMIN') {
            // Admin Override - Approves everything
            updateData.bhStatus = status;
            updateData.hrStatus = status;
            updateData.status = status;
            updateData.approvedBy = userId;
        }
        else {
            return res.status(403).json({ message: 'Not authorized to approve' });
        }

        result = await model.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

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
            select: { id: true, name: true, email: true, status: true, designation: true }
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
                role: req.body.role || 'EMPLOYEE',
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



const fs = require('fs');

// @desc    Import employees from Excel
// @route   POST /api/admin/employees/import
// @access  Private (Admin)
const importEmployees = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an Excel file' });
        }

        // Read from file path (Multer DiskStorage)
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        // Delete file after reading to save space
        try {
            fs.unlinkSync(req.file.path);
        } catch (err) {
            console.error('Failed to delete temp file:', err);
        }

        if (data.length === 0) {
            return res.status(400).json({ message: 'Excel sheet is empty' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        const salt = await bcrypt.genSalt(10);
        // Default password for bulk import
        const hashedPassword = await bcrypt.hash('employee@123', salt);

        for (const [index, row] of data.entries()) {
            // Excel Columns: Name, Email, Role (Optional), Designation (Optional), Password (Optional)
            const name = row['Name'] || row['name'];
            const email = row['Email'] || row['email'];
            const role = (row['Role'] || row['role'] || 'EMPLOYEE').toUpperCase();
            const designation = (row['Designation'] || row['designation'] || 'LA').toUpperCase();
            const rawPassword = row['Password'] || row['password'];

            if (!name || !email) {
                results.failed++;
                results.errors.push(`Row ${index + 2}: Missing Name or Email`);
                continue;
            }

            try {
                // Check if user exists
                const existingUser = await prisma.user.findUnique({ where: { email } });
                if (existingUser) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: Email ${email} already exists`);
                    continue;
                }

                // Use provided password or default 'employee@123'
                const passwordToHash = rawPassword ? String(rawPassword) : 'employee@123';
                const userHashedPassword = await bcrypt.hash(passwordToHash, salt);

                await prisma.user.create({
                    data: {
                        name,
                        email,
                        password: userHashedPassword,
                        role: ['EMPLOYEE', 'HR', 'BUSINESS_HEAD', 'ADMIN'].includes(role) ? role : 'EMPLOYEE',
                        designation
                    }
                });
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`Row ${index + 2}: ${err.message}`);
            }
        }

        res.json({
            message: `Import complete. Added ${results.success} users. Failed ${results.failed}.`,
            details: results
        });

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
    deleteEmployee,
    importEmployees
};
