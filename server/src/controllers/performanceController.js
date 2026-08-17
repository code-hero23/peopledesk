const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to generate automatic remarks based on total score
const generateAutoRemark = (totalScore) => {
    const score = parseFloat(totalScore) || 0;
    if (score >= 90) return 'Outstanding overall performance! Exceptional output, consistency, and quality.';
    if (score >= 80) return 'Excellent overall performance! Consistently meets and exceeds expectations.';
    if (score >= 70) return 'Good overall performance. Solid work quality with steady attendance and logs.';
    if (score >= 60) return 'Satisfactory performance. Scope for improvement in worklog consistency and efficiency.';
    if (score >= 50) return 'Needs improvement. Please focus on regular attendance and daily worklogs.';
    return 'Requires immediate improvement across key performance categories.';
};

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

        const finalRemarks = (remarks && remarks.toString().trim() !== '' && !remarks.toString().includes('Leave Consistency'))
            ? remarks.toString().trim()
            : generateAutoRemark(totalScore);

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
                remarks: finalRemarks,
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
                remarks: finalRemarks,
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
    const m = parseInt(month);
    const y = parseInt(year);

    // 26th-25th cycle for target month M: 26th of (M-1) to 25th of M
    const cycleStart = new Date(Date.UTC(y, m - 2, 26, 0, 0, 0, 0));
    const cycleEnd = new Date(Date.UTC(y, m - 1, 25, 23, 59, 59, 999));

    // Calendar month M: 1st of M to last day of M
    const calStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const calEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    // Query attendance in both cycle and calendar ranges to take higher count
    const [attCycle, attCal] = await Promise.all([
        prisma.attendance.count({
            where: {
                userId: parseInt(userId),
                date: { gte: cycleStart, lte: cycleEnd },
                status: 'PRESENT'
            }
        }),
        prisma.attendance.count({
            where: {
                userId: parseInt(userId),
                date: { gte: calStart, lte: calEnd },
                status: 'PRESENT'
            }
        })
    ]);

    const presentDays = Math.max(attCycle, attCal);
    const systemScore = Math.min(15, (presentDays / 26) * 15);

    // Query worklog dates in both cycle and calendar ranges
    const [wlCycle, wlCal] = await Promise.all([
        prisma.workLog.groupBy({
            by: ['date'],
            where: {
                userId: parseInt(userId),
                date: { gte: cycleStart, lte: cycleEnd }
            }
        }),
        prisma.workLog.groupBy({
            by: ['date'],
            where: {
                userId: parseInt(userId),
                date: { gte: calStart, lte: calEnd }
            }
        })
    ]);

    const worklogDays = Math.max(wlCycle.length, wlCal.length);
    const consistencyScore = Math.min(30, (worklogDays / 26) * 30);

    return {
        system: parseFloat(systemScore.toFixed(2)),
        consistency: parseFloat(consistencyScore.toFixed(2)),
        counts: {
            presentDays,
            worklogDays
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
    const targetId = parseInt(userId);

    if (!targetId || isNaN(targetId)) {
        return res.json([]);
    }

    try {
        const history = await prisma.performanceScore.findMany({
            where: { userId: targetId },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            include: {
                user: { select: { name: true, designation: true } }
            }
        });

        res.json(history || []);
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
        const targetId = req.user?.id ? parseInt(req.user.id) : NaN;

        if (!targetId || isNaN(targetId)) {
            return res.status(401).json({ message: 'User authorization required' });
        }

        const scores = await prisma.performanceScore.findMany({
            where: { userId: targetId },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ]
        });

        res.json(scores || []);
    } catch (error) {
        console.error('Error fetching own performance:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Helper to find value from row object with flexible key matching
const getVal = (obj, pattern) => {
    if (!obj) return undefined;
    const key = Object.keys(obj).find(k => k.toLowerCase().includes(pattern));
    return key ? obj[key] : undefined;
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
            const email = data.email || data.Email || getVal(data, 'mail');
            const month = data.month || data.Month || getVal(data, 'month');
            const year = data.year || data.Year || getVal(data, 'year');
            const efficiency = data.efficiency ?? data.Efficiency ?? getVal(data, 'eff');
            const quality = data.quality ?? data.Quality ?? getVal(data, 'qual');
            const behaviour = data.behaviour ?? data.Behaviour ?? getVal(data, 'behav');
            const remarks = data.remarks ?? data.Remarks ?? getVal(data, 'rem') ?? '';

            let consistencyRaw = data.consistency ?? data.Consistency ?? getVal(data, 'consis');
            let systemRaw = data.system ?? data.System ?? getVal(data, 'sys');

            try {
                if (!email || !month || !year) {
                    throw new Error(`Missing required fields for entry: ${email || 'unknown'}`);
                }

                // Find user by email (case-insensitive)
                const targetUser = await prisma.user.findFirst({
                    where: { email: { equals: email.toString().trim(), mode: 'insensitive' } }
                });

                if (!targetUser) {
                    throw new Error(`User not found for email: ${email}`);
                }

                let consistencyVal = (consistencyRaw !== undefined && consistencyRaw !== null && consistencyRaw.toString().trim() !== '')
                    ? parseFloat(consistencyRaw)
                    : NaN;

                let systemVal = (systemRaw !== undefined && systemRaw !== null && systemRaw.toString().trim() !== '')
                    ? parseFloat(systemRaw)
                    : NaN;

                // Auto-fetch missing, invalid, or 0 consistency/system scores from attendance & worklogs
                if (isNaN(consistencyVal) || consistencyVal === 0 || isNaN(systemVal) || systemVal === 0) {
                    const autoMetrics = await computeAutomatedMetrics(targetUser.id, parseInt(month), parseInt(year));
                    
                    if (isNaN(consistencyVal) || consistencyVal === 0) {
                        consistencyVal = autoMetrics.consistency;
                    }
                    if (isNaN(systemVal) || systemVal === 0) {
                        systemVal = autoMetrics.system;
                    }
                }

                const effVal = parseFloat(efficiency) || 0;
                const qualVal = parseFloat(quality) || 0;
                const behVal = parseFloat(behaviour) || 0;

                const totalScore = parseFloat((effVal + consistencyVal + qualVal + systemVal + behVal).toFixed(2));

                const finalRemarks = (remarks && remarks.toString().trim() !== '' && !remarks.toString().includes('Leave Consistency'))
                    ? remarks.toString().trim()
                    : generateAutoRemark(totalScore);

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
                        remarks: finalRemarks,
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
                        remarks: finalRemarks,
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
