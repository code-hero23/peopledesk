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
                bh: { select: { name: true } }
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
            creName
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
                createdById: req.user.id
            },
            include: {
                createdBy: { select: { name: true } },
                bh: { select: { name: true } }
            }
        });

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
                bh: { select: { name: true } }
            }
        });

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
            where: { role: 'BUSINESS_HEAD' },
            select: { id: true, name: true }
        });
        res.json(bhs);
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
    getAllBHs
};
