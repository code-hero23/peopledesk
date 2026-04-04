const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Upsert performance score for an employee
// @route   POST /api/performance
// @access  Private (Admin, HR)
const setEmployeeScore = async (req, res) => {
    const { userId, month, year, attendance, productivity, quality, system, behaviour, remarks } = req.body;

    if (!userId || !month || !year) {
        return res.status(400).json({ message: 'UserId, month, and year are required' });
    }

    try {
        // Validation: Scores cannot exceed their maximums
        // Weights: Attendance (20), Productivity (30), Quality (20), System (15), Behaviour (15)
        if (attendance > 20 || productivity > 30 || quality > 20 || system > 15 || behaviour > 15) {
            return res.status(400).json({ message: 'One or more scores exceed their weighted maximum' });
        }

        const totalScore = (attendance || 0) + (productivity || 0) + (quality || 0) + (system || 0) + (behaviour || 0);

        const score = await prisma.performanceScore.upsert({
            where: {
                userId_month_year: {
                    userId: parseInt(userId),
                    month: parseInt(month),
                    year: parseInt(year)
                }
            },
            update: {
                attendance: parseFloat(attendance),
                productivity: parseFloat(productivity),
                quality: parseFloat(quality),
                system: parseFloat(system),
                behaviour: parseFloat(behaviour),
                totalScore,
                remarks,
                updatedById: req.user.id
            },
            create: {
                userId: parseInt(userId),
                month: parseInt(month),
                year: parseInt(year),
                attendance: parseFloat(attendance),
                productivity: parseFloat(productivity),
                quality: parseFloat(quality),
                system: parseFloat(system),
                behaviour: parseFloat(behaviour),
                totalScore,
                remarks,
                updatedById: req.user.id
            }
        });

        res.status(201).json(score);
    } catch (error) {
        console.error('Error setting performance score:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get performance history for an employee
// @route   GET /api/performance/history/:userId
// @access  Private (Admin, HR, BH)
const getPerformanceHistory = async (req, res) => {
    const { userId } = req.params;

    try {
        const history = await prisma.performanceScore.findMany({
            where: { userId: parseInt(userId) },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            include: {
                user: { select: { name: true, designation: true } }
            }
        });

        res.json(history);
    } catch (error) {
        console.error('Error fetching performance history:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get current employee's own scoreboard
// @route   GET /api/performance/my-scores
// @access  Private
const getMyPerformance = async (req, res) => {
    try {
        const scores = await prisma.performanceScore.findMany({
            where: { userId: req.user.id },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ]
        });

        res.json(scores);
    } catch (error) {
        console.error('Error fetching own performance:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    setEmployeeScore,
    getPerformanceHistory,
    getMyPerformance
};
