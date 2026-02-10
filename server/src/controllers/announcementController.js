const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get all active announcements
// @route   GET /api/announcements
// @access  Private
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            where: {
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                author: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.status(200).json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching announcements', error: error.message });
    }
};

// @desc    Create an announcement
// @route   POST /api/announcements
// @access  Private (Admin/HR/BH)
exports.createAnnouncement = async (req, res) => {
    const { title, content, type, priority, expiresAt } = req.body;
    try {
        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                type: type || 'INFO',
                priority: priority || 'LOW',
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                authorId: req.user.id
            }
        });
        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ message: 'Error creating announcement', error: error.message });
    }
};

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin/HR/BH)
exports.updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { title, content, type, priority, isActive, expiresAt } = req.body;
    try {
        const announcement = await prisma.announcement.update({
            where: { id: parseInt(id) },
            data: {
                title,
                content,
                type,
                priority,
                isActive,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            }
        });
        res.status(200).json(announcement);
    } catch (error) {
        res.status(500).json({ message: 'Error updating announcement', error: error.message });
    }
};

// @desc    Delete (Deactivate) an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin/HR/BH)
exports.deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.announcement.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });
        res.status(200).json({ message: 'Announcement deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting announcement', error: error.message });
    }
};
