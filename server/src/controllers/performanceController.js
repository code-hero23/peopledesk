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

// Helper to calculate automated metrics for an employee
const computeAutomatedMetrics = async (userId, month, year) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // 1. System (PD): (Present Days / 26) * 15
    const presentDays = await prisma.attendance.count({
        where: {
            userId: parseInt(userId),
            date: { gte: startDate, lte: endDate },
            status: 'PRESENT'
        }
    });

    const systemScore = Math.min(15, (presentDays / 26) * 15);

    // 2. Consistency: (Days with Worklogs / 26) * 30
    const worklogDates = await prisma.workLog.groupBy({
        by: ['date'],
        where: {
            userId: parseInt(userId),
            date: { gte: startDate, lte: endDate }
        }
    });

    const consistencyScore = Math.min(30, (worklogDates.length / 26) * 30);

    return {
        system: parseFloat(systemScore.toFixed(2)),
        consistency: parseFloat(consistencyScore.toFixed(2)),
        counts: {
            presentDays,
            worklogDays: worklogDates.length
        }
    };
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
        const metrics = await computeAutomatedMetrics(userId, month, year);
        res.json(metrics);
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

// @desc    Get current employee's own KPI scoreboard
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
            const email = data.email || data.Email;
            const month = data.month || data.Month;
            const year = data.year || data.Year;
            const efficiency = data.efficiency ?? data.Efficiency;
            const quality = data.quality ?? data.Quality;
            const behaviour = data.behaviour ?? data.Behaviour ?? data.behavior ?? data.Behavior;
            const remarks = data.remarks ?? data.Remarks ?? '';

            let consistency = data.consistency ?? data.Consistency ?? data['consistency (30)'] ?? data['consis'];
            let system = data.system ?? data.System ?? data['system (pd)'] ?? data['system (15)'] ?? data['sys'];

            try {
                if (!email || !month || !year) {
                    throw new Error(`Missing required fields for entry: ${email || 'unknown'}`);
                }

                // Find user by email (case-insensitive)
                const targetUser = await prisma.user.findFirst({
                    where: { email: { equals: email.trim(), mode: 'insensitive' } }
                });

                if (!targetUser) {
                    throw new Error(`User not found for email: ${email}`);
                }

                let consistencyVal = (consistency !== undefined && consistency !== null && consistency.toString().trim() !== '')
                    ? parseFloat(consistency)
                    : NaN;

                let systemVal = (system !== undefined && system !== null && system.toString().trim() !== '')
                    ? parseFloat(system)
                    : NaN;

                // Auto-fetch missing/invalid consistency or system scores from attendance & worklogs
                if (isNaN(consistencyVal) || isNaN(systemVal)) {
                    const autoMetrics = await computeAutomatedMetrics(targetUser.id, parseInt(month), parseInt(year));
                    if (isNaN(consistencyVal)) {
                        consistencyVal = autoMetrics.consistency;
                    }
                    if (isNaN(systemVal)) {
                        systemVal = autoMetrics.system;
                    }
                }

                const effVal = parseFloat(efficiency) || 0;
                const qualVal = parseFloat(quality) || 0;
                const behVal = parseFloat(behaviour) || 0;

                const totalScore = parseFloat((effVal + consistencyVal + qualVal + systemVal + behVal).toFixed(2));

                await prisma.performanceScore.upsert({
                    where: {
                        userId_month_year: {
                            userId: targetUser.id,
                            month: parseInt(month),
                            year: parseInt(year)
                        }
                    },
                    update: {
                        efficiency: effVal,
                        consistency: consistencyVal,
                        quality: qualVal,
                        system: systemVal,
                        behaviour: behVal,
                        totalScore,
                        remarks,
                        updatedById: req.user.id
                    },
                    create: {
                        userId: targetUser.id,
                        month: parseInt(month),
                        year: parseInt(year),
                        efficiency: effVal,
                        consistency: consistencyVal,
                        quality: qualVal,
                        system: systemVal,
                        behaviour: behVal,
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
