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

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING'
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

        const permissionRequest = await prisma.permissionRequest.create({
            data: {
                userId,
                date: new Date(date),
                startTime,
                endTime,
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING'
            },
        });

        res.status(201).json(permissionRequest);
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

        // Combine and sort or return separately. Returning object with both arrays is cleaner.
        res.json({ leaves, permissions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createLeaveRequest, createPermissionRequest, getMyRequests, getBusinessHeads };
