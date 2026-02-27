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

        // Helper to get days in a specific range for a request
        const getDaysInRange = (start, end, rangeStart, rangeEnd, type) => {
            if (type === 'HALF_DAY') return 0.5;

            const effectiveStart = new Date(Math.max(new Date(start), new Date(rangeStart)));
            const effectiveEnd = new Date(Math.min(new Date(end), new Date(rangeEnd)));

            if (effectiveStart > effectiveEnd) return 0;

            const diffTime = Math.abs(effectiveEnd - effectiveStart);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        };

        // 1. Identify all cycles this leave request spans
        const requestStart = new Date(startDate);
        const requestEnd = new Date(endDate);

        const startCycleStart = getCycleStartDateIST(requestStart);
        const startCycleEnd = getCycleEndDateIST(requestStart);

        const endCycleStart = getCycleStartDateIST(requestEnd);
        const endCycleEnd = getCycleEndDateIST(requestEnd);

        // We check limits for the start cycle and end cycle (most leaves only cover 1 or 2 cycles)
        const cyclesToCheck = [
            { start: startCycleStart, end: startCycleEnd }
        ];

        // If it spans to a different cycle, add it
        if (startCycleStart.getTime() !== endCycleStart.getTime()) {
            cyclesToCheck.push({ start: endCycleStart, end: endCycleEnd });
        }

        let isExceededLimit = false;

        for (const cycle of cyclesToCheck) {
            // Calculate how many days of THIS request fall into THIS cycle
            const daysInThisCycle = getDaysInRange(requestStart, requestEnd, cycle.start, cycle.end, type);

            // If the request itself has > 4 days in a single cycle
            if (daysInThisCycle > 4) {
                isExceededLimit = true;
                break;
            }

            // Get existing leaves in THIS cycle
            const existingInCycle = await prisma.leaveRequest.findMany({
                where: {
                    userId,
                    OR: [
                        { startDate: { gte: cycle.start, lte: cycle.end } },
                        { endDate: { gte: cycle.start, lte: cycle.end } },
                        { AND: [{ startDate: { lte: cycle.start } }, { endDate: { gte: cycle.end } }] }
                    ],
                    status: { not: 'REJECTED' }
                }
            });

            const existingDaysInCycle = existingInCycle.reduce((sum, r) => {
                return sum + getDaysInRange(r.startDate, r.endDate, cycle.start, cycle.end, r.type);
            }, 0);

            if ((existingDaysInCycle + daysInThisCycle) > 4) {
                isExceededLimit = true;
                break;
            }
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING',
                isExceededLimit
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
                startDate: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        const permissions = await prisma.permissionRequest.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        const siteVisits = await prisma.siteVisitRequest.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        const showroomVisits = await prisma.showroomVisitRequest.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        const wfh = await prisma.wfhRequest.findMany({
            where: {
                userId,
                startDate: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Combine and sort or return separately. Returning object with all arrays is cleaner.
        res.json({ leaves, permissions, siteVisits, showroomVisits, wfh });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createLeaveRequest, createPermissionRequest, createSiteVisitRequest, createShowroomVisitRequest, getMyRequests, getBusinessHeads };
