const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Upsert performance score for an employee
// @route   POST /api/performance/set
// @access  Private (Admin, HR)
const setEmployeeScore = async (req, res) => {
    const { userId, month, year, efficiency, consistency, quality, system, behaviour, remarks } = req.body;

    if (!userId || !month || !year) {
        return res.status(400).json({ message: 'UserId, month, and year are required' });
    }

    try {
        // Validation: Scores cannot exceed their maximums
        // Weights: Efficiency (20), Consistency (30), Quality (20), System (15), Behaviour (15)
        if (efficiency > 20 || consistency > 30 || quality > 20 || system > 15 || behaviour > 15) {
            return res.status(400).json({ message: 'One or more scores exceed their weighted maximum' });
        }

        const totalScore = (efficiency || 0) + (consistency || 0) + (quality || 0) + (system || 0) + (behaviour || 0);

        const score = await prisma.performanceScore.upsert({
            where: {
                userId_month_year: {
                    userId: parseInt(userId),
                    month: parseInt(month),
                    year: parseInt(year)
                }
            },
            update: {
                efficiency: parseFloat(efficiency),
                consistency: parseFloat(consistency),
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
                efficiency: parseFloat(efficiency),
                consistency: parseFloat(consistency),
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

// @desc    Calculate automated metrics for an employee
// @route   GET /api/performance/calculate/:userId
// @access  Private (Admin, HR)
const calculateAutomatedMetrics = async (req, res) => {
    const { userId } = req.params;
    const { month, year } = req.query;

    if (!userId || !month || !year) {
        return res.status(400).json({ message: 'UserId, month, and year are required' });
    }

    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

        // 1. Efficiency: (Present Days / 26) * 20
        const presentDays = await prisma.attendance.count({
            where: {
                userId: parseInt(userId),
                date: { gte: startDate, lte: endDate },
                status: 'PRESENT'
            }
        });

        const efficiencyScore = Math.min(20, (presentDays / 26) * 20);

        // 2. Consistency: (Days with Worklogs / 26) * 30
        // Use groupBy to get unique dates
        const worklogDates = await prisma.workLog.groupBy({
            by: ['date'],
            where: {
                userId: parseInt(userId),
                date: { gte: startDate, lte: endDate }
            }
        });

        const consistencyScore = Math.min(30, (worklogDates.length / 26) * 30);

        res.json({
            efficiency: parseFloat(efficiencyScore.toFixed(2)),
            consistency: parseFloat(consistencyScore.toFixed(2)),
            counts: {
                presentDays,
                worklogDays: worklogDates.length
            }
        });
    } catch (error) {
        console.error('Error calculating metrics:', error);
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

// @desc    Bulk import performance scores
// @route   POST /api/performance/import
// @access  Private (Admin, HR)
const importPerformanceScores = async (req, res) => {
    const { scores } = req.body; // Expecting an array of score objects

    if (!scores || !Array.isArray(scores)) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of scores.' });
    }

    try {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const data of scores) {
            const { email, month, year, efficiency, consistency, quality, system, behaviour, remarks } = data;

            try {
                if (!email || !month || !year) {
                    throw new Error(`Missing required fields for entry: ${email || 'unknown'}`);
                }

                // Find user by email
                const targetUser = await prisma.user.findUnique({
                    where: { email }
                });

                if (!targetUser) {
                    throw new Error(`User not found for email: ${email}`);
                }

                const totalScore = (parseFloat(efficiency) || 0) + (parseFloat(consistency) || 0) + (parseFloat(quality) || 0) + (parseFloat(system) || 0) + (parseFloat(behaviour) || 0);

                await prisma.performanceScore.upsert({
                    where: {
                        userId_month_year: {
                            userId: targetUser.id,
                            month: parseInt(month),
                            year: parseInt(year)
                        }
                    },
                    update: {
                        efficiency: parseFloat(efficiency) || 0,
                        consistency: parseFloat(consistency) || 0,
                        quality: parseFloat(quality) || 0,
                        system: parseFloat(system) || 0,
                        behaviour: parseFloat(behaviour) || 0,
                        totalScore,
                        remarks,
                        updatedById: req.user.id
                    },
                    create: {
                        userId: targetUser.id,
                        month: parseInt(month),
                        year: parseInt(year),
                        efficiency: parseFloat(efficiency) || 0,
                        consistency: parseFloat(consistency) || 0,
                        quality: parseFloat(quality) || 0,
                        system: parseFloat(system) || 0,
                        behaviour: parseFloat(behaviour) || 0,
                        totalScore,
                        remarks,
                        updatedById: req.user.id
                    }
                });

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(err.message);
            }
        }

        res.json({
            message: `Import completed. Success: ${results.success}, Failed: ${results.failed}`,
            ...results
        });
    } catch (error) {
        console.error('Error importing performance scores:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    setEmployeeScore,
    calculateAutomatedMetrics,
    getPerformanceHistory,
    getMyPerformance,
    importPerformanceScores
};
