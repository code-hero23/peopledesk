const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { parseRobustDate } = require('../utils/dateHelpers');

// @desc    Get all walkin entries
// @route   GET /api/walkin
// @access  Private (Admin, CRE)
const getAllWalkinEntries = async (req, res) => {
    try {
        const { role, id } = req.user;
        let where = {};

        // Employees only see their own walkins. Others (Admin, BH, HR) see all.
        if (role === 'EMPLOYEE') {
            where = { createdById: id };
        }

        const entries = await prisma.walkinEntry.findMany({
            where,
            include: {
                createdBy: { select: { name: true } },
                bh: { select: { name: true } },
                fa: { select: { name: true } },
                cre: { select: { name: true } }
            },
            orderBy: { dateOfVisit: 'desc' }
        });
        res.json(entries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create new walkin entry
// @route   POST /api/walkin
// @access  Private (CRE, Admin)
const createWalkinEntry = async (req, res) => {
    try {
        const {
            faTeam,
            architect,
            bhId,
            clientName,
            contactNumber,
            project,
            status,
            dateOfVisit,
            dayOfVisit,
            tentativeTime,
            showroom,
            inTime,
            outTime,
            visitStatus,
            remarks,
            creName,
            faId,
            creId
        } = req.body;

        if (!faTeam || !bhId || !clientName || !contactNumber || !dateOfVisit) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const entry = await prisma.walkinEntry.create({
            data: {
                faTeam,
                architect,
                bhId: parseInt(bhId),
                clientName,
                contactNumber,
                project,
                status,
                dateOfVisit: parseRobustDate(dateOfVisit),
                dayOfVisit,
                tentativeTime,
                showroom,
                inTime,
                outTime,
                visitStatus,
                remarks,
                creName,
                faId: faId ? parseInt(faId) : undefined,
                creId: creId ? parseInt(creId) : undefined,
                createdById: req.user.id
            },
            include: {
                createdBy: { select: { name: true } },
                bh: { select: { name: true } },
                fa: { select: { name: true } },
                cre: { select: { name: true } }
            }
        });

        // Trigger Notifications for Assigned Staff
        const notifyStaff = async (userId, title, message) => {
            if (!userId) return;
            try {
                await prisma.notification.create({
                    data: {
                        userId: parseInt(userId),
                        title,
                        message,
                        type: 'WALKIN_ASSIGNED',
                        relatedId: entry.id
                    }
                });
            } catch (err) {
                console.error('Notification error:', err.message);
            }
        };

        const msg = `New walk-in: ${clientName} for ${showroom || 'Showroom'} on ${new Date(dateOfVisit).toLocaleDateString()}`;
        await notifyStaff(bhId, 'New Walk-in Assigned', msg);
        await notifyStaff(faId, 'New Walk-in Assigned', msg);
        await notifyStaff(creId, 'New Walk-in Assigned', msg);

        res.status(201).json(entry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update walkin entry
// @route   PUT /api/walkin/:id
// @access  Private (CRE, Admin)
const updateWalkinEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Security: Fetch existing entry
        const existingEntry = await prisma.walkinEntry.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingEntry) {
            return res.status(404).json({ message: 'Walkin entry not found' });
        }

        // Authorization: ADMIN, BUSINESS_HEAD, Creator, or assigned BH can update
        const isAuthorized = req.user.role === 'ADMIN' || 
                           req.user.role === 'BUSINESS_HEAD' ||
                           existingEntry.createdById === req.user.id || 
                           existingEntry.bhId === req.user.id;
        
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to update this entry' });
        }

        if (updateData.bhId) updateData.bhId = parseInt(updateData.bhId);
        if (updateData.dateOfVisit) updateData.dateOfVisit = parseRobustDate(updateData.dateOfVisit);

        // Remove relation objects if they exist in the body (prevents Prisma errors)
        delete updateData.createdBy;
        delete updateData.bh;
        delete updateData.id; // Also safety: don't try to update the ID

        const entry = await prisma.walkinEntry.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                createdBy: { select: { name: true } },
                bh: { select: { name: true } },
                fa: { select: { name: true } },
                cre: { select: { name: true } }
            }
        });

        // Trigger notification if assignment changed
        const notifyStaffUpdate = async (userId, title, message) => {
            if (!userId) return;
            try {
                await prisma.notification.create({
                    data: {
                        userId: parseInt(userId),
                        title,
                        message,
                        type: 'WALKIN_UPDATED',
                        relatedId: entry.id
                    }
                });
            } catch (err) {
                console.error('Notification error:', err.message);
            }
        };

        const updateMsg = `Walk-in Updated: ${entry.clientName} | Status: ${entry.visitStatus || 'PENDING'} | In: ${entry.inTime || '--'}`;
        if (req.body.bhId && parseInt(req.body.bhId) !== existingEntry.bhId) {
            await notifyStaffUpdate(req.body.bhId, 'Entry Assigned to You', updateMsg);
        }
        if (req.body.faId && parseInt(req.body.faId) !== existingEntry.faId) {
            await notifyStaffUpdate(req.body.faId, 'Entry Assigned to You', updateMsg);
        }
        if (req.body.creId && parseInt(req.body.creId) !== existingEntry.creId) {
            await notifyStaffUpdate(req.body.creId, 'Entry Assigned to You', updateMsg);
        }

        res.json(entry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete walkin entry
// @route   DELETE /api/walkin/:id
// @access  Private (Admin)
const deleteWalkinEntry = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.walkinEntry.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all Business Heads
// @route   GET /api/walkin/bhs
// @access  Private
const getAllBHs = async (req, res) => {
    try {
        const bhs = await prisma.user.findMany({
            where: { role: 'BUSINESS_HEAD', status: 'ACTIVE' },
            select: { id: true, name: true }
        });
        res.json(bhs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get staff members for dropdown
// @route   GET /api/walkin/staff
// @access  Private
const getStaffMembers = async (req, res) => {
    try {
        const { designations } = req.query; // e.g. "FA,LA" or "CRE,CLIENT-FACILITATOR"
        if (!designations) return res.status(400).json({ message: 'Designations required' });

        const designList = designations.split(',');
        const staff = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                designation: { in: designList }
            },
            select: { id: true, name: true, designation: true }
        });
        res.json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getAllWalkinEntries,
    createWalkinEntry,
    updateWalkinEntry,
    deleteWalkinEntry,
    getAllBHs,
    getStaffMembers
};
