const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get all Business Heads
// @route   GET /api/requests/business-heads
// @access  Private
const getBusinessHeads = async (req, res) => {
    try {
        const businessHeads = await prisma.user.findMany({
            where: { role: 'BUSINESS_HEAD', status: 'ACTIVE' },
            select: { id: true, name: true, email: true }
        });
        res.json(businessHeads);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new leave request
// @route   POST /api/requests/leave
// @access  Private (Employee)
const createLeaveRequest = async (req, res) => {
    const { type, startDate, endDate, reason, targetBhId } = req.body;

    if (!type || !startDate || !endDate || !reason) {
        return res.status(400).json({ message: 'Please details for all fields' });
    }

    try {
        const userId = req.user.id;

        // Basic validation: End date should be after start date
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ message: 'End date cannot be before start date' });
        }

        // Check for 4+ LEAVE requests this month (The 5th will be flagged)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const leaveCount = await prisma.leaveRequest.count({
            where: { userId, createdAt: { gte: startOfMonth } }
        });

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING',
                isExceededLimit: leaveCount >= 4
            },
        });

        res.status(201).json(leaveRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new permission request (2 hours max)
// @route   POST /api/requests/permission
// @access  Private (Employee)
const createPermissionRequest = async (req, res) => {
    const { date, startTime, endTime, reason, targetBhId } = req.body;

    if (!date || !startTime || !endTime || !reason) {
        return res.status(400).json({ message: 'Please provide all details' });
    }

    try {
        const userId = req.user.id;

        // Check for 4+ PERMISSION requests this month (The 5th will be flagged)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const permCount = await prisma.permissionRequest.count({
            where: { userId, createdAt: { gte: startOfMonth } }
        });

        const permissionRequest = await prisma.permissionRequest.create({
            data: {
                userId,
                date: new Date(date),
                startTime,
                endTime,
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING',
                isExceededLimit: permCount >= 4
            },
        });

        res.status(201).json(permissionRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new site visit request
// @route   POST /api/requests/site-visit
// @access  Private (Employee)
const createSiteVisitRequest = async (req, res) => {
    const { projectName, location, date, startTime, endTime, reason, targetBhId } = req.body;

    if (!projectName || !location || !date || !startTime || !endTime || !reason) {
        return res.status(400).json({ message: 'Please provide all details' });
    }

    try {
        const userId = req.user.id;

        const siteVisitRequest = await prisma.siteVisitRequest.create({
            data: {
                userId,
                projectName,
                location,
                date: new Date(date),
                startTime,
                endTime,
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING'
            },
        });

        res.status(201).json(siteVisitRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new showroom visit request
// @route   POST /api/requests/showroom-visit
// @access  Private (Employee)
const createShowroomVisitRequest = async (req, res) => {
    const { date, startTime, endTime, sourceShowroom, destinationShowroom, reason, targetBhId } = req.body;

    if (!date || !startTime || !endTime || !sourceShowroom || !destinationShowroom || !reason) {
        return res.status(400).json({ message: 'Please provide all details' });
    }

    try {
        const userId = req.user.id;

        const showroomVisitRequest = await prisma.showroomVisitRequest.create({
            data: {
                userId,
                date: new Date(date),
                startTime,
                endTime,
                sourceShowroom,
                destinationShowroom,
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING'
            },
        });

        res.status(201).json(showroomVisitRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all my requests (Leaves + Permissions)
// @route   GET /api/requests
// @access  Private
const getMyRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const leaves = await prisma.leaveRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const permissions = await prisma.permissionRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const siteVisits = await prisma.siteVisitRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const showroomVisits = await prisma.showroomVisitRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // Combine and sort or return separately. Returning object with both arrays is cleaner.
        // Combine and sort or return separately. Returning object with both arrays is cleaner.
        res.json({ leaves, permissions, siteVisits, showroomVisits });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createLeaveRequest, createPermissionRequest, createSiteVisitRequest, createShowroomVisitRequest, getMyRequests, getBusinessHeads };
