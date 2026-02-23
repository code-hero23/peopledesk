const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const prisma = new PrismaClient();

// @desc    Get all employees
// @route   GET /api/admin/employees
// @access  Private (Admin)
const getAllEmployees = async (req, res) => {
    try {
        let where = {};
        if (req.user.role === 'AE_MANAGER') {
            where = { designation: 'AE' };
        } else if (req.user.role === 'BUSINESS_HEAD') {
            where = { reportingBhId: req.user.id };
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                designation: true,
                lastWorkLogDate: true,
                reportingBhId: true,
                reportingBh: { select: { name: true } }
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
        const { date } = req.query;

        // Date filter logic
        let leaveDateFilter = {};
        let generalDateFilter = {};
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            leaveDateFilter = {
                startDate: { lte: endOfDay },
                endDate: { gte: startOfDay }
            };

            generalDateFilter = {
                date: { gte: startOfDay, lte: endOfDay }
            };
        }

        // Base query conditions
        let leaveWhere = leaveDateFilter;
        let permissionWhere = generalDateFilter;
        let visitWhere = generalDateFilter;

        if (userRole === 'BUSINESS_HEAD') {
            const userId = req.user.id;
            const bhCondition = {
                OR: [
                    { targetBhId: userId },
                    { targetBhId: null }
                ]
            };
            leaveWhere = { AND: [leaveWhere, { bhStatus: 'PENDING', status: 'PENDING' }, bhCondition] };
            permissionWhere = { AND: [permissionWhere, { bhStatus: 'PENDING', status: 'PENDING' }, bhCondition] };
        } else if (userRole === 'HR') {
            leaveWhere = { AND: [leaveWhere, { status: 'PENDING' }] };
            permissionWhere = { AND: [permissionWhere, { status: 'PENDING' }] };
        } else if (userRole === 'ADMIN') {
            leaveWhere = { AND: [leaveWhere, { status: 'PENDING' }] };
            permissionWhere = { AND: [permissionWhere, { status: 'PENDING' }] };
        } else if (userRole === 'AE_MANAGER') {
            leaveWhere = { AND: [leaveWhere, { status: 'PENDING', user: { designation: 'AE' } }] };
            permissionWhere = { AND: [permissionWhere, { status: 'PENDING', user: { designation: 'AE' } }] };
        } else {
            return res.json({ leaves: [], permissions: [], siteVisits: [], showroomVisits: [] });
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

        const siteVisitsRaw = await prisma.siteVisitRequest.findMany({
            where: { AND: [visitWhere, permissionWhere.AND ? permissionWhere.AND[1] : {}] },
            include: { user: { select: { name: true, email: true, designation: true } } },
            orderBy: { createdAt: 'asc' },
        });

        const showroomVisitsRaw = await prisma.showroomVisitRequest.findMany({
            where: { AND: [visitWhere, permissionWhere.AND ? permissionWhere.AND[1] : {}] },
            include: { user: { select: { name: true, email: true, designation: true } } },
            orderBy: { createdAt: 'asc' },
        });

        // Enrich with BH Name
        const leaveBhIds = [...new Set(leavesRaw.map(r => r.bhId).filter(id => id))];
        const permissionBhIds = [...new Set(permissionsRaw.map(r => r.bhId).filter(id => id))];
        const siteBhIds = [...new Set(siteVisitsRaw.map(r => r.bhId).filter(id => id))];
        const showroomBhIds = [...new Set(showroomVisitsRaw.map(r => r.bhId).filter(id => id))];

        const allBhIds = [...new Set([...leaveBhIds, ...permissionBhIds, ...siteBhIds, ...showroomBhIds])];

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
        const siteVisits = siteVisitsRaw.map(enrichWithBhName);
        const showroomVisits = showroomVisitsRaw.map(enrichWithBhName);

        res.json({ leaves, permissions, siteVisits, showroomVisits });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get request history (Approved/Rejected)
// @route   GET /api/admin/requests/history
// @access  Private (Admin, BH, HR)
// @desc    Get request history (Approved/Rejected)
// @route   GET /api/admin/requests/history
// @access  Private (Admin, BH, HR)
const getRequestHistory = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;
        const { date } = req.query;

        // Date filter logic
        let leaveDateFilter = {};
        let generalDateFilter = {};
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            leaveDateFilter = {
                startDate: { lte: endOfDay },
                endDate: { gte: startOfDay }
            };

            generalDateFilter = {
                date: { gte: startOfDay, lte: endOfDay }
            };
        }

        // Initialize where clauses with date filters
        let leaveWhere = { ...leaveDateFilter };
        let permissionWhere = { ...generalDateFilter };
        let visitWhere = { ...generalDateFilter };

        if (userRole === 'BUSINESS_HEAD') {
            const bhRequestsFilter = {
                bhStatus: { not: 'PENDING' },
                OR: [{ targetBhId: userId }, { bhId: userId }]
            };

            // Visits do not have 'bhId' field in schema
            const bhVisitsFilter = {
                bhStatus: { not: 'PENDING' },
                targetBhId: userId
            };

            leaveWhere = { AND: [leaveWhere, bhRequestsFilter] };
            permissionWhere = { AND: [permissionWhere, bhRequestsFilter] };

            // Use visits-specific filter that doesn't check bhId
            visitWhere = { AND: [visitWhere, bhVisitsFilter] };

        } else if (userRole === 'HR' || userRole === 'ADMIN') {
            const statusFilter = { status: { in: ['APPROVED', 'REJECTED'] } };

            leaveWhere = { AND: [leaveWhere, statusFilter] };
            permissionWhere = { AND: [permissionWhere, statusFilter] };
            visitWhere = { AND: [visitWhere, statusFilter] };

        } else if (userRole === 'AE_MANAGER') {
            const aeFilter = {
                status: { in: ['APPROVED', 'REJECTED'] },
                user: { designation: 'AE' }
            };

            leaveWhere = { AND: [leaveWhere, aeFilter] };
            permissionWhere = { AND: [permissionWhere, aeFilter] };
            visitWhere = { AND: [visitWhere, aeFilter] };

        } else {
            return res.json({ leaves: [], permissions: [], siteVisits: [], showroomVisits: [] });
        }

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

        const siteVisitsRaw = await prisma.siteVisitRequest.findMany({
            where: visitWhere,
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const showroomVisitsRaw = await prisma.showroomVisitRequest.findMany({
            where: visitWhere,
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Enrich with BH Name
        const leaveBhIds = [...new Set(leavesRaw.map(r => r.bhId).filter(id => id))];
        const permissionBhIds = [...new Set(permissionsRaw.map(r => r.bhId).filter(id => id))];
        const siteBhIds = [...new Set(siteVisitsRaw.map(r => r.bhId).filter(id => id))];
        const showroomBhIds = [...new Set(showroomVisitsRaw.map(r => r.bhId).filter(id => id))];
        const allBhIds = [...new Set([...leaveBhIds, ...permissionBhIds, ...siteBhIds, ...showroomBhIds])];

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
        const siteVisits = siteVisitsRaw.map(enrichWithBhName);
        const showroomVisits = showroomVisitsRaw.map(enrichWithBhName);

        res.json({ leaves, permissions, siteVisits, showroomVisits });
    } catch (error) {
        console.error("getRequestHistory Error:", error);
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
        const model = type === 'leave' ? prisma.leaveRequest :
            type === 'permission' ? prisma.permissionRequest :
                type === 'site-visit' ? prisma.siteVisitRequest :
                    type === 'showroom-visit' ? prisma.showroomVisitRequest : null;

        if (!model) return res.status(400).json({ message: 'Invalid request type' });

        // Construct update data based on Role
        let updateData = {};

        if (userRole === 'BUSINESS_HEAD') {
            // Business Head cannot approve visits anymore
            if (type === 'site-visit' || type === 'showroom-visit') {
                return res.status(403).json({ message: 'Managers cannot approve visit requests. Only HR can approve visits.' });
            }

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
        } else if (userRole === 'AE_MANAGER') {
            // AE MANAGER - Acts like BH but for all AE designated staff
            // Restricted from approving visits as per new HR-only visit flow
            if (type === 'site-visit' || type === 'showroom-visit') {
                return res.status(403).json({ message: 'Managers cannot approve visit requests. Only HR can approve visits.' });
            }

            updateData.bhStatus = status;
            updateData.bhId = userId;

            // If Rejected by AE Manager, reject overall
            if (status === 'REJECTED') {
                updateData.status = 'REJECTED';
            }
            // If Approved, overall remains PENDING (waiting for HR)
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

        // Determine Role and Designation based on Creator
        let newRole = req.body.role || 'EMPLOYEE';
        let newDesignation = designation || 'LA';

        if (req.user.role === 'AE_MANAGER') {
            newRole = 'EMPLOYEE';
            newDesignation = 'AE';
        } else if (newRole === 'AE_MANAGER') {
            newDesignation = 'AE MANAGER';
        }

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: newRole,
                designation: newDesignation,
                reportingBhId: req.body.reportingBhId ? parseInt(req.body.reportingBhId) : undefined,
            },
            select: {
                id: true, name: true, email: true, role: true, status: true, designation: true, lastWorkLogDate: true,
                reportingBhId: true,
                reportingBh: { select: { name: true } }
            },
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
        let where = {};
        if (req.user.role === 'AE_MANAGER') {
            where = { user: { designation: 'AE' } };
        } else if (req.user.role === 'BUSINESS_HEAD') {
            where = { user: { reportingBhId: req.user.id } };
        }

        const logs = await prisma.workLog.findMany({
            where,
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
        const { date, startDate, endDate } = req.query;

        let start, end;

        if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            const queryDate = date ? new Date(date) : new Date();
            start = new Date(queryDate.setHours(0, 0, 0, 0));
            end = new Date(queryDate.setHours(23, 59, 59, 999));
        }

        // 1. Get all active users (needed for single-day "Not Submitted" view)
        let userWhere = { status: 'ACTIVE', role: 'EMPLOYEE' };
        if (req.user.role === 'AE_MANAGER') {
            userWhere.designation = 'AE';
        } else if (req.user.role === 'BUSINESS_HEAD') {
            userWhere.reportingBhId = req.user.id;
        }

        const users = await prisma.user.findMany({
            where: userWhere,
            select: { id: true, name: true, email: true, designation: true, reportingBhId: true }
        });

        // 2. Get work logs for the range
        const logs = await prisma.workLog.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            },
            include: { user: { select: { id: true, name: true, email: true, designation: true, reportingBhId: true } } },
            orderBy: { date: 'desc' }
        });

        // 3. Merge data
        // If it's a specific single day, we show ALL employees (Submitted/Pending)
        if (!startDate || (startDate === endDate)) {
            const dailyReport = users.map(user => {
                const log = logs.find(l => l.userId === user.id);
                return {
                    user: user,
                    status: log ? 'SUBMITTED' : 'PENDING',
                    workLog: log || null
                };
            });
            return res.json(dailyReport);
        }

        // If it's a range, we only show SUBMITTED logs
        const rangeReport = logs.map(log => ({
            user: log.user,
            status: 'SUBMITTED',
            workLog: log
        }));

        res.json(rangeReport);
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
        let where = {};
        if (req.user.role === 'AE_MANAGER') {
            where = { user: { designation: 'AE' } };
        } else if (req.user.role === 'BUSINESS_HEAD') {
            where = { user: { reportingBhId: req.user.id } };
        }

        const attendance = await prisma.attendance.findMany({
            where,
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
        let userWhere = { status: 'ACTIVE', role: 'EMPLOYEE' };
        if (req.user.role === 'AE_MANAGER') {
            userWhere.designation = 'AE';
        } else if (req.user.role === 'BUSINESS_HEAD') {
            userWhere.reportingBhId = req.user.id;
        }

        const users = await prisma.user.findMany({
            where: userWhere,
            select: { id: true, name: true, email: true, designation: true, reportingBhId: true }
        });

        // 2. Get attendance for the date
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                breaks: true
            }
        });

        // 3. Merge data
        const dailyReport = users.map(user => {
            // Find ALL records for this user (AEs might have multiple)
            const userRecords = attendanceRecords.filter(a => a.userId === user.id);

            // Sort by time
            userRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

            let totalGrossDurationMinutes = 0;
            let totalBreakDeductionMinutes = 0;
            let totalMeetingMinutes = 0;

            const sessions = userRecords.map(record => {
                // Calculate session duration if checked out
                if (record.checkoutTime) {
                    const gross = (new Date(record.checkoutTime) - new Date(record.date)) / 60000; // minutes
                    totalGrossDurationMinutes += gross;
                }

                // Calculate breaks for this session
                const sessionBreaks = record.breaks || [];
                sessionBreaks.forEach(b => {
                    const duration = b.duration || 0;
                    if (['TEA', 'LUNCH'].includes(b.breakType)) {
                        totalBreakDeductionMinutes += duration;
                    } else if (['CLIENT_MEETING', 'BH_MEETING'].includes(b.breakType)) {
                        totalMeetingMinutes += duration;
                    }
                });

                return {
                    id: record.id,
                    timeIn: record.date,
                    timeOut: record.checkoutTime,
                    checkInPhoto: record.checkInPhoto,
                    checkoutPhoto: record.checkoutPhoto,
                    deviceInfo: record.deviceInfo,
                    ipAddress: record.ipAddress,
                    checkoutDeviceInfo: record.checkoutDeviceInfo,
                    checkoutIpAddress: record.checkoutIpAddress,
                    breaks: sessionBreaks
                };
            });

            // Calculate overall Time In and Time Out for the day
            let timeIn = null;
            let timeOut = null;
            let deviceInfo = null;
            let checkoutDeviceInfo = null;

            if (userRecords.length > 0) {
                timeIn = userRecords[0].date; // First check-in
                deviceInfo = userRecords[0].deviceInfo;
                const lastRecord = userRecords[userRecords.length - 1];
                timeOut = lastRecord.checkoutTime; // Last check-out (might be null)
                checkoutDeviceInfo = lastRecord.checkoutDeviceInfo;
            }

            const effectiveMinutes = Math.max(0, totalGrossDurationMinutes - totalBreakDeductionMinutes);
            const totalHours = (effectiveMinutes / 60).toFixed(2);

            return {
                user: user,
                status: userRecords.length > 0 ? 'PRESENT' : 'ABSENT',
                timeIn,
                timeOut,
                totalHours: totalHours,
                effectiveMinutes: effectiveMinutes,
                deviceInfo,
                checkoutDeviceInfo,
                sessions: sessions,
                breakData: {
                    personal: Math.round(totalBreakDeductionMinutes),
                    meetings: Math.round(totalMeetingMinutes)
                }
            };
        });

        res.json(dailyReport);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Get employees currently in a break or meeting
// @route   GET /api/admin/active-statuses
// @access  Private (Admin, BH, HR)
const getActiveStatuses = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeBreaks = await prisma.breakLog.findMany({
            where: {
                endTime: null,
                startTime: { gte: today }
            },
            include: {
                attendance: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                designation: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        const formattedStatuses = activeBreaks.map(b => ({
            id: b.id,
            userId: b.attendance.userId,
            userName: b.attendance.user.name,
            designation: b.attendance.user.designation,
            breakType: b.breakType,
            startTime: b.startTime
        }));

        res.json(formattedStatuses);
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
    const { name, email, designation, role, password } = req.body;

    try {
        let updateData = {
            name,
            email,
            designation,
            role: role || undefined,
            reportingBhId: req.body.reportingBhId !== undefined ? (req.body.reportingBhId ? parseInt(req.body.reportingBhId) : null) : undefined
        };

        // If password is provided, hash it and add to update data
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, designation: true, status: true, reportingBhId: true }
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
                        role: ['EMPLOYEE', 'HR', 'BUSINESS_HEAD', 'ADMIN', 'AE_MANAGER'].includes(role) ? role : 'EMPLOYEE',
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

// @desc    Delete a request (Admin/HR only)
// @route   DELETE /api/admin/requests/:type/:id
// @access  Private (Admin, HR)
const deleteRequest = async (req, res) => {
    const { type, id } = req.params;
    const userRole = req.user.role;

    // Only Admin and HR can delete
    if (!['ADMIN', 'HR'].includes(userRole)) {
        return res.status(403).json({ message: 'Not authorized to delete requests' });
    }

    try {
        let model;
        if (type === 'leave') model = prisma.leaveRequest;
        else if (type === 'permission') model = prisma.permissionRequest;
        else if (type === 'site-visit') model = prisma.siteVisitRequest;
        else if (type === 'showroom-visit') model = prisma.showroomVisitRequest;
        else return res.status(400).json({ message: 'Invalid request type' });

        await model.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Request deleted successfully', id: parseInt(id), type });
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
    getActiveStatuses,
    updateEmployee,
    deleteEmployee,
    importEmployees,
    deleteRequest
};
