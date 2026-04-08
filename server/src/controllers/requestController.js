const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getCycleStartDateIST, getCycleEndDateIST, parseRobustDate } = require('../utils/dateHelpers');
const { sendEmail } = require('../utils/emailService');

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

        // Check if a leave request already exists for this user and overlapping dates
        const overlappingLeave = await prisma.leaveRequest.findFirst({
            where: {
                userId,
                OR: [
                    { startDate: { lte: parseRobustDate(endDate) }, endDate: { gte: parseRobustDate(startDate) } }
                ],
                status: { not: 'REJECTED' }
            }
        });

        if (overlappingLeave) {
            return res.status(400).json({ message: 'You already have an active leave request overlapping these dates.' });
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                type,
                startDate: parseRobustDate(startDate),
                endDate: parseRobustDate(endDate),
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING',
                isExceededLimit
            },
        });

        // Trigger excessive request notification check
        await checkAndNotifyExcessiveRequests(userId, parseRobustDate(startDate));

        res.status(201).json(leaveRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Helper to check if user has exceeded 6 permissions or leaves this cycle
 * and send email alert to BH and HR
 */
const checkAndNotifyExcessiveRequests = async (userId, targetDate) => {
    try {
        const cycleStart = getCycleStartDateIST(targetDate);
        const cycleEnd = getCycleEndDateIST(targetDate);

        // 1. Count Permissions
        const permCount = await prisma.permissionRequest.count({
            where: {
                userId,
                date: { gte: cycleStart, lte: cycleEnd },
                status: { not: 'REJECTED' }
            }
        });

        // 2. Count Leave Days
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                userId,
                OR: [
                    { startDate: { gte: cycleStart, lte: cycleEnd } },
                    { endDate: { gte: cycleStart, lte: cycleEnd } },
                    { AND: [{ startDate: { lte: cycleStart } }, { endDate: { gte: cycleEnd } }] }
                ],
                status: { not: 'REJECTED' }
            }
        });

        const getDaysInCycle = (start, end, cStart, cEnd, type) => {
            if (type === 'HALF_DAY') return 0.5;
            const effectiveStart = new Date(Math.max(new Date(start), new Date(cStart)));
            const effectiveEnd = new Date(Math.min(new Date(end), new Date(cEnd)));
            if (effectiveStart > effectiveEnd) return 0;
            const diffTime = Math.abs(effectiveEnd - effectiveStart);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        };

        const totalLeaveDays = leaves.reduce((sum, r) => {
            return sum + getDaysInCycle(r.startDate, r.endDate, cycleStart, cycleEnd, r.type);
        }, 0);

        if (permCount >= 6 || totalLeaveDays >= 6) {
            // Fetch User, BH and HR details
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { reportingBh: true }
            });

            if (!user) return;

            const bhEmail = user.reportingBh?.email;
            const hrEmail = 'es.cookscape@gmail.com';
            const reason = permCount >= 6 ? `Permission count (${permCount})` : `Leave day count (${totalLeaveDays.toFixed(1)})`;

            const emailHtml = `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #d32f2f;">Excessive Absence Alert</h2>
                    <p>Employee <strong>${user.name}</strong> (${user.designation}) has reached a limit in the current attendance cycle.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr style="background: #f9f9f9;"><td style="padding: 10px;"><strong>Threshold Trigger:</strong></td><td style="padding: 10px;">${reason} reached 6+</td></tr>
                        <tr><td style="padding: 10px;"><strong>Cycle:</strong></td><td style="padding: 10px;">${cycleStart.toLocaleDateString()} to ${cycleEnd.toLocaleDateString()}</td></tr>
                    </table>
                    <p style="margin-top: 20px; color: #666;">This is an automated notification from PeopleDesk.</p>
                </div>
            `;

            const recipients = [hrEmail];
            if (bhEmail) recipients.push(bhEmail);

            await sendEmail({
                to: recipients.join(','),
                subject: `Alert: Excessive Absence - ${user.name}`,
                html: emailHtml
            });

            console.log(`Sent excessive request alert for ${user.name} to ${recipients.join(',')}`);
        }
    } catch (err) {
        console.error('Error in checkAndNotifyExcessiveRequests:', err);
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
        const cycleStart = getCycleStartDateIST(parseRobustDate(date));
        const cycleEnd = getCycleEndDateIST(parseRobustDate(date));

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
                date: parseRobustDate(date)
            }
        });

        if (existingPermission) {
            return res.status(400).json({ message: 'You have already raised a permission request for this date.' });
        }

        const permissionRequest = await prisma.permissionRequest.create({
            data: {
                userId,
                date: parseRobustDate(date),
                startTime,
                endTime,
                reason,
                targetBhId: targetBhId ? parseInt(targetBhId) : null,
                status: 'PENDING',
                isExceededLimit: permCount >= 4
            },
        });

        // Trigger excessive request notification check
        await checkAndNotifyExcessiveRequests(userId, parseRobustDate(date));

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

        // Check for duplicate site visit request
        const existingSiteVisit = await prisma.siteVisitRequest.findFirst({
            where: {
                userId,
                projectName,
                date: parseRobustDate(date),
                startTime,
                endTime
            }
        });

        if (existingSiteVisit) {
            return res.status(400).json({ message: 'A site visit request with these details already exists.' });
        }

        const siteVisitRequest = await prisma.siteVisitRequest.create({
            data: {
                userId,
                projectName,
                location,
                date: parseRobustDate(date),
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

        // Check for duplicate showroom visit request
        const existingShowroomVisit = await prisma.showroomVisitRequest.findFirst({
            where: {
                userId,
                date: parseRobustDate(date),
                startTime,
                endTime,
                sourceShowroom,
                destinationShowroom
            }
        });

        if (existingShowroomVisit) {
            return res.status(400).json({ message: 'A showroom visit request with these details already exists.' });
        }

        const showroomVisitRequest = await prisma.showroomVisitRequest.create({
            data: {
                userId,
                date: parseRobustDate(date),
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
// @desc    Get all my requests (Leaves + Permissions + Stats)
// @route   GET /api/requests
// @access  Private
const getMyRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;

        let start, end;
        if (startDate && endDate) {
            start = parseRobustDate(startDate);
            end = parseRobustDate(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            start = getCycleStartDateIST();
            end = getCycleEndDateIST();
        }

        console.log('Fetching leaves...');
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                userId,
                startDate: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('Fetching permissions...');
        const permissions = await prisma.permissionRequest.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('Fetching site visits...');
        const siteVisits = await prisma.siteVisitRequest.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('Fetching showroom visits...');
        const showroomVisits = await prisma.showroomVisitRequest.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('Fetching WFH...');
        const wfh = await prisma.wfhRequest.findMany({
            where: {
                userId,
                startDate: { lte: end },
                endDate: { gte: start }
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('Fetching attendance history...');
        const attendanceHistory = await prisma.attendance.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            orderBy: { date: 'desc' }
        });

        // Construct cycleData for the frontend calendar
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // For label, we use IST-adjusted dates
        const istOffset = 5.5 * 60 * 60 * 1000;
        const startIST = new Date(start.getTime() + istOffset);
        const endIST = new Date(end.getTime() + istOffset);

        const label = `${startIST.getUTCDate()} ${monthNames[startIST.getUTCMonth()]} - ${endIST.getUTCDate()} ${monthNames[endIST.getUTCMonth()]}`;

        const cycleData = {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            label,
            subLabel: "Current Attendance Cycle"
        };

        const stats = {
            presentDays: attendanceHistory.length,
            leaveDays: leaves.filter(l => l.status === 'APPROVED').length,
            permissionDays: permissions.filter(p => p.status === 'APPROVED').length
        };

        res.json({
            leaves,
            permissions,
            siteVisits,
            showroomVisits,
            wfh,
            attendanceHistory,
            cycleData,
            stats
        });
    } catch (error) {
        console.error('ERROR IN getMyRequests:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createLeaveRequest, createPermissionRequest, createSiteVisitRequest, createShowroomVisitRequest, getMyRequests, getBusinessHeads, checkAndNotifyExcessiveRequests };
