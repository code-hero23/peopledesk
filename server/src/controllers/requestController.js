const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getCycleStartDateIST, getCycleEndDateIST } = require('../utils/dateHelpers');

// @desc    Get all Business Heads
// @route   GET /api/requests/business-heads
// @access  Private
const getBusinessHeads = async (req, res) => {
    try {
        const businessHeads = await prisma.user.findMany({
            where: {
                role: { in: ['BUSINESS_HEAD', 'AE_MANAGER'] },
                status: 'ACTIVE'
            },
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

        // Check for 4+ LEAVE DAYS this month (using custom cycle: 26th to 25th)
        const cycleStart = getCycleStartDateIST(startDate);
        const cycleEnd = getCycleEndDateIST(startDate);

        const monthlyLeaves = await prisma.leaveRequest.findMany({
            where: {
                userId,
                startDate: { gte: cycleStart, lte: cycleEnd }
            }
        });

        const calculateDays = (start, end, type) => {
            if (type === 'HALF_DAY') return 0.5;
            const diffTime = Math.abs(new Date(end) - new Date(start));
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        };

        const totalExistingDays = monthlyLeaves.reduce((sum, req) => {
            return sum + calculateDays(req.startDate, req.endDate, req.type);
        }, 0);

        const newRequestDays = calculateDays(startDate, endDate, type);

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING',
                isExceededLimit: newRequestDays > 4 || (totalExistingDays + newRequestDays) > 4
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

        // Check for 4+ PERMISSION requests this month (using custom cycle: 26th to 25th)
        const cycleStart = getCycleStartDateIST(date);
        const cycleEnd = getCycleEndDateIST(date);

        const permCount = await prisma.permissionRequest.count({
            where: {
                userId,
                date: { gte: cycleStart, lte: cycleEnd }
            }
        });

        // Check if a permission already exists for this date
        const existingPermission = await prisma.permissionRequest.findFirst({
            where: {
                userId,
                date: new Date(date)
            }
        });

        if (existingPermission) {
            return res.status(400).json({ message: 'You have already raised a permission request for this date.' });
        }

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
        const { startDate, endDate } = req.query;

        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            start = getCycleStartDateIST();
            end = getCycleEndDateIST();
        }

        const leaves = await prisma.leaveRequest.findMany({
            where: {
                userId,
                createdAt: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        const permissions = await prisma.permissionRequest.findMany({
            where: {
                userId,
                createdAt: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        const siteVisits = await prisma.siteVisitRequest.findMany({
            where: {
                userId,
                createdAt: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        const showroomVisits = await prisma.showroomVisitRequest.findMany({
            where: {
                userId,
                createdAt: { gte: start, lte: end }
            },
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
