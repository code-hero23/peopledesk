const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (LA, Admin)
const createProject = async (req, res) => {
    try {
        const {
            name,
            number,
            mailId,
            location,
            freezingAmount,
            variant,
            projectValue,
            woodwork,
            addOns,
            cpCode,
            source,
            fa,
            referalBonus,
            siteStatus,
            specialNote,
            requirements,
            colours,
            onlineMeeting,
            showroomMeeting,
            measurements,
            latitude,
            longitude
        } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Project name is required' });
        }

        const project = await prisma.project.create({
            data: {
                name,
                number,
                mailId,
                location,
                freezingAmount,
                variant,
                projectValue,
                woodwork,
                addOns,
                cpCode,
                source,
                fa,
                referalBonus,
                siteStatus,
                specialNote,
                requirements,     // Prisma handles JSON automatically
                colours,
                onlineMeeting,
                showroomMeeting,
                measurements,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                managerId: req.user.id // Assign creator as manager? or just track distinct createdBy if schema supports
            }
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                manager: {
                    select: { name: true, email: true }
                }
            }
        });
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    createProject,
    getProjects
};
