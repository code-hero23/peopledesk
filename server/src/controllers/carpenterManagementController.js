const prisma = require('../config/prisma');

// Helper to check for Vendor Management and Oversight access
const isAuthorized = (user) => {
    if (!user) return false;
    const role = (user.role || '').toUpperCase();
    const desig = (user.designation || '').toUpperCase();
    const email = (user.email || '').toLowerCase();

    // Standard PeopleDesk Vendor Management (explicitly NOT Wall2Wall)
    if (desig.includes('VENDOR') && role !== 'WALL2WALL_EMPLOYEE') return true;

    // Management oversight
    if (['ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'HR', 'ACCOUNTS_MANAGER'].includes(role)) return true;
    if (desig === 'COO' || desig.includes('CHIEF OPERATIONAL OFFICER') || desig === 'BH') return true;
    if (desig.includes('CARPENTER') || role.includes('CARPENTER')) return true;
    if (email === 'designs.cookscape@gmail.com' || email === 'bh@cookscape.com') return true;

    return false;
};

// Self-healing table initialization
let tablesReady = false;
const ensureTables = async () => {
    if (tablesReady) return;
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "CarpenterSiteAssignment" (
                "id" SERIAL PRIMARY KEY,
                "siteName" TEXT NOT NULL,
                "clientName" TEXT,
                "siteAddress" TEXT,
                "carpenterName" TEXT NOT NULL,
                "carpenterPhone" TEXT,
                "assignedById" INTEGER,
                "assignedByName" TEXT,
                "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "targetDate" TIMESTAMP(3),
                "completedDate" TIMESTAMP(3),
                "scopeOfWork" TEXT,
                "progressPercentage" INTEGER NOT NULL DEFAULT 0,
                "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
                "remarks" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "CarpenterDailyWorkLog" (
                "id" SERIAL PRIMARY KEY,
                "assignmentId" INTEGER NOT NULL REFERENCES "CarpenterSiteAssignment"("id") ON DELETE CASCADE,
                "logDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "workDoneText" TEXT NOT NULL,
                "progressPercentage" INTEGER NOT NULL,
                "carpentersCount" INTEGER DEFAULT 1,
                "hoursWorked" DOUBLE PRECISION DEFAULT 8,
                "blockersOrIssues" TEXT,
                "photoUrls" JSONB DEFAULT '[]'::jsonb,
                "loggedById" INTEGER,
                "loggedByName" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        tablesReady = true;
    } catch (err) {
        console.error('ensureTables (CarpenterManagement) error:', err.message);
    }
};

// @desc    Get all carpenter site assignments
// @route   GET /api/carpenter-management/assignments
// @access  Private (Vendor Management, Admin, BH, COO)
const getAssignments = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized to access Carpenter Management' });
    }
    await ensureTables();
    try {
        const { search, status } = req.query;
        let query = `
            SELECT a.*,
                   COUNT(l.id)::int as "totalLogsCount",
                   MAX(l."logDate") as "latestLogDate",
                   (
                       SELECT l2."workDoneText" 
                       FROM "CarpenterDailyWorkLog" l2 
                       WHERE l2."assignmentId" = a.id 
                       ORDER BY l2."logDate" DESC, l2.id DESC 
                       LIMIT 1
                   ) as "latestWorkDone"
            FROM "CarpenterSiteAssignment" a
            LEFT JOIN "CarpenterDailyWorkLog" l ON l."assignmentId" = a.id
            WHERE 1=1
        `;

        const params = [];
        let pIndex = 1;

        if (search && search.trim()) {
            query += ` AND (a."siteName" ILIKE $${pIndex} OR a."clientName" ILIKE $${pIndex} OR a."carpenterName" ILIKE $${pIndex} OR a."siteAddress" ILIKE $${pIndex})`;
            params.push(`%${search.trim()}%`);
            pIndex++;
        }

        if (status && status !== 'ALL') {
            query += ` AND a."status" = $${pIndex}`;
            params.push(status);
            pIndex++;
        }

        query += ` GROUP BY a.id ORDER BY 
            CASE 
                WHEN a."status" = 'IN_PROGRESS' THEN 1
                WHEN a."status" = 'ASSIGNED' THEN 2
                WHEN a."status" = 'ON_HOLD' THEN 3
                ELSE 4
            END,
            a."updatedAt" DESC`;

        const assignments = await prisma.$queryRawUnsafe(query, ...params);
        res.json(assignments);
    } catch (error) {
        console.error('Failed to get assignments:', error);
        res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
    }
};

// @desc    Get single assignment with full chronological daily work logs
// @route   GET /api/carpenter-management/assignments/:id
// @access  Private
const getAssignmentById = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    await ensureTables();
    try {
        const id = parseInt(req.params.id);
        const assignments = await prisma.$queryRawUnsafe(`
            SELECT * FROM "CarpenterSiteAssignment" WHERE id = $1
        `, id);

        if (!assignments || assignments.length === 0) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        const logs = await prisma.$queryRawUnsafe(`
            SELECT * FROM "CarpenterDailyWorkLog" 
            WHERE "assignmentId" = $1 
            ORDER BY "logDate" ASC, id ASC
        `, id);

        res.json({
            assignment: assignments[0],
            dailyLogs: logs
        });
    } catch (error) {
        console.error('Failed to get assignment by ID:', error);
        res.status(500).json({ message: 'Failed to fetch assignment details', error: error.message });
    }
};

// @desc    Assign carpenter to site
// @route   POST /api/carpenter-management/assignments
// @access  Private (Vendor Management, Admin, BH)
const createAssignment = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    await ensureTables();
    try {
        const {
            siteName,
            clientName,
            siteAddress,
            carpenterName,
            carpenterPhone,
            startDate,
            targetDate,
            scopeOfWork,
            initialProgress,
            initialWorkDone,
            status,
            remarks
        } = req.body;

        if (!siteName || !carpenterName) {
            return res.status(400).json({ message: 'Site name and Carpenter name are required' });
        }

        const parsedStartDate = startDate ? new Date(startDate) : new Date();
        const parsedTargetDate = targetDate ? new Date(targetDate) : null;
        const initialProg = Math.min(100, Math.max(0, parseInt(initialProgress, 10) || 0));
        const finalStatus = status || (initialProg >= 100 ? 'COMPLETED' : 'IN_PROGRESS');

        const inserted = await prisma.$queryRawUnsafe(`
            INSERT INTO "CarpenterSiteAssignment" (
                "siteName", "clientName", "siteAddress", "carpenterName", "carpenterPhone",
                "assignedById", "assignedByName", "startDate", "targetDate", "scopeOfWork",
                "progressPercentage", "status", "remarks", "createdAt", "updatedAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            RETURNING *
        `, 
            siteName, 
            clientName || '', 
            siteAddress || '', 
            carpenterName, 
            carpenterPhone || '', 
            req.user.id, 
            req.user.name, 
            parsedStartDate, 
            parsedTargetDate, 
            scopeOfWork || '', 
            initialProg, 
            finalStatus, 
            remarks || ''
        );

        const newAssignment = inserted[0];

        // If an initial work log was provided, log it as Day 1
        if (initialWorkDone && initialWorkDone.trim()) {
            await prisma.$queryRawUnsafe(`
                INSERT INTO "CarpenterDailyWorkLog" (
                    "assignmentId", "logDate", "workDoneText", "progressPercentage",
                    "carpentersCount", "hoursWorked", "blockersOrIssues", "photoUrls",
                    "loggedById", "loggedByName", "createdAt"
                )
                VALUES ($1, $2, $3, $4, 1, 8, '', '[]'::jsonb, $5, $6, NOW())
            `, newAssignment.id, parsedStartDate, initialWorkDone.trim(), initialProg, req.user.id, req.user.name);
        }

        res.status(201).json(newAssignment);
    } catch (error) {
        console.error('Failed to create carpenter site assignment:', error);
        res.status(500).json({ message: 'Failed to assign carpenter to site', error: error.message });
    }
};

// @desc    Update carpenter site assignment
// @route   PUT /api/carpenter-management/assignments/:id
// @access  Private
const updateAssignment = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    await ensureTables();
    try {
        const id = parseInt(req.params.id);
        const {
            siteName,
            clientName,
            siteAddress,
            carpenterName,
            carpenterPhone,
            startDate,
            targetDate,
            completedDate,
            scopeOfWork,
            progressPercentage,
            status,
            remarks
        } = req.body;

        const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "CarpenterSiteAssignment" WHERE id = $1`, id);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        const cur = existing[0];
        const finalSite = siteName !== undefined ? siteName : cur.siteName;
        const finalClient = clientName !== undefined ? clientName : cur.clientName;
        const finalAddress = siteAddress !== undefined ? siteAddress : cur.siteAddress;
        const finalCarpenter = carpenterName !== undefined ? carpenterName : cur.carpenterName;
        const finalPhone = carpenterPhone !== undefined ? carpenterPhone : cur.carpenterPhone;
        const finalStart = startDate ? new Date(startDate) : cur.startDate;
        const finalTarget = targetDate ? new Date(targetDate) : cur.targetDate;
        const finalScope = scopeOfWork !== undefined ? scopeOfWork : cur.scopeOfWork;
        const finalRemarks = remarks !== undefined ? remarks : cur.remarks;
        let finalStatus = status !== undefined ? status : cur.status;
        let finalProg = progressPercentage !== undefined ? parseInt(progressPercentage, 10) : cur.progressPercentage;
        finalProg = Math.min(100, Math.max(0, isNaN(finalProg) ? 0 : finalProg));

        let finalCompleted = completedDate ? new Date(completedDate) : cur.completedDate;
        if (finalProg >= 100 && finalStatus !== 'COMPLETED') {
            finalStatus = 'COMPLETED';
            if (!finalCompleted) finalCompleted = new Date();
        }

        const updated = await prisma.$queryRawUnsafe(`
            UPDATE "CarpenterSiteAssignment"
            SET "siteName" = $1, "clientName" = $2, "siteAddress" = $3, "carpenterName" = $4,
                "carpenterPhone" = $5, "startDate" = $6, "targetDate" = $7, "completedDate" = $8,
                "scopeOfWork" = $9, "progressPercentage" = $10, "status" = $11, "remarks" = $12,
                "updatedAt" = NOW()
            WHERE id = $13
            RETURNING *
        `, finalSite, finalClient, finalAddress, finalCarpenter, finalPhone, finalStart, finalTarget, finalCompleted, finalScope, finalProg, finalStatus, finalRemarks, id);

        res.json(updated[0] || { message: 'Updated successfully' });
    } catch (error) {
        console.error('Failed to update assignment:', error);
        res.status(500).json({ message: 'Failed to update assignment', error: error.message });
    }
};

// @desc    Delete assignment and all daily logs
// @route   DELETE /api/carpenter-management/assignments/:id
// @access  Private
const deleteAssignment = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    await ensureTables();
    try {
        const id = parseInt(req.params.id);
        await prisma.$queryRawUnsafe(`DELETE FROM "CarpenterDailyWorkLog" WHERE "assignmentId" = $1`, id);
        await prisma.$queryRawUnsafe(`DELETE FROM "CarpenterSiteAssignment" WHERE id = $1`, id);
        res.json({ message: 'Assignment and all logs deleted successfully' });
    } catch (error) {
        console.error('Failed to delete assignment:', error);
        res.status(500).json({ message: 'Failed to delete assignment', error: error.message });
    }
};

// @desc    Add a daily work log (How much work done today until project completion)
// @route   POST /api/carpenter-management/assignments/:id/daily-logs
// @access  Private (Vendor Management, Admin, BH)
const addDailyWorkLog = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    await ensureTables();
    try {
        const assignmentId = parseInt(req.params.id);
        const {
            logDate,
            workDoneText,
            progressPercentage,
            carpentersCount,
            hoursWorked,
            blockersOrIssues,
            markCompleted
        } = req.body;

        if (!workDoneText || !workDoneText.trim()) {
            return res.status(400).json({ message: 'Description of work done today is required' });
        }

        const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "CarpenterSiteAssignment" WHERE id = $1`, assignmentId);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ message: 'Site assignment not found' });
        }

        const parsedDate = logDate ? new Date(logDate) : new Date();
        const parsedProg = Math.min(100, Math.max(0, parseInt(progressPercentage, 10) || existing[0].progressPercentage));
        const numCarpenters = parseInt(carpentersCount, 10) || 1;
        const numHours = parseFloat(hoursWorked) || 8;

        // Process uploaded work photos
        const files = req.files || (req.file ? [req.file] : []);
        const photoUrls = files.map(f => `/uploads/${f.filename}`);

        const insertedLog = await prisma.$queryRawUnsafe(`
            INSERT INTO "CarpenterDailyWorkLog" (
                "assignmentId", "logDate", "workDoneText", "progressPercentage",
                "carpentersCount", "hoursWorked", "blockersOrIssues", "photoUrls",
                "loggedById", "loggedByName", "createdAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, NOW())
            RETURNING *
        `, assignmentId, parsedDate, workDoneText.trim(), parsedProg, numCarpenters, numHours, blockersOrIssues || '', JSON.stringify(photoUrls), req.user.id, req.user.name);

        // Update overall assignment progress and status
        const isCompleted = markCompleted === true || markCompleted === 'true' || parsedProg >= 100;
        const newStatus = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
        const completedDate = isCompleted ? new Date() : null;

        await prisma.$queryRawUnsafe(`
            UPDATE "CarpenterSiteAssignment"
            SET "progressPercentage" = $1,
                "status" = $2,
                "completedDate" = COALESCE($3, "completedDate"),
                "updatedAt" = NOW()
            WHERE id = $4
        `, parsedProg, newStatus, completedDate, assignmentId);

        res.status(201).json({
            message: 'Daily work progress logged successfully',
            log: insertedLog[0],
            newProgress: parsedProg,
            status: newStatus
        });
    } catch (error) {
        console.error('Failed to add daily work log:', error);
        res.status(500).json({ message: 'Failed to log daily work', error: error.message });
    }
};

// @desc    Delete a single daily work log
// @route   DELETE /api/carpenter-management/daily-logs/:logId
// @access  Private
const deleteDailyWorkLog = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    await ensureTables();
    try {
        const logId = parseInt(req.params.logId);
        const found = await prisma.$queryRawUnsafe(`SELECT * FROM "CarpenterDailyWorkLog" WHERE id = $1`, logId);
        if (!found || found.length === 0) {
            return res.status(404).json({ message: 'Log not found' });
        }

        const assignmentId = found[0].assignmentId;
        await prisma.$queryRawUnsafe(`DELETE FROM "CarpenterDailyWorkLog" WHERE id = $1`, logId);

        // Recalculate assignment progress from most recent remaining log
        const latestLogs = await prisma.$queryRawUnsafe(`
            SELECT "progressPercentage" FROM "CarpenterDailyWorkLog"
            WHERE "assignmentId" = $1
            ORDER BY "logDate" DESC, id DESC
            LIMIT 1
        `, assignmentId);

        const newProg = latestLogs && latestLogs.length > 0 ? latestLogs[0].progressPercentage : 0;
        await prisma.$queryRawUnsafe(`
            UPDATE "CarpenterSiteAssignment"
            SET "progressPercentage" = $1, "updatedAt" = NOW()
            WHERE id = $2
        `, newProg, assignmentId);

        res.json({ message: 'Daily work log deleted successfully', newProgress: newProg });
    } catch (error) {
        console.error('Failed to delete daily work log:', error);
        res.status(500).json({ message: 'Failed to delete work log', error: error.message });
    }
};

// @desc    Get summary KPI stats
// @route   GET /api/carpenter-management/stats
// @access  Private
const getStats = async (req, res) => {
    if (!isAuthorized(req.user)) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    await ensureTables();
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT 
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE "status" = 'IN_PROGRESS')::int as "inProgress",
                COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int as completed,
                COUNT(*) FILTER (WHERE "status" = 'ASSIGNED')::int as assigned,
                COUNT(*) FILTER (WHERE "status" = 'ON_HOLD')::int as "onHold",
                COALESCE(ROUND(AVG("progressPercentage")), 0)::int as "avgProgress"
            FROM "CarpenterSiteAssignment"
        `);

        res.json(rows[0] || { total: 0, inProgress: 0, completed: 0, assigned: 0, onHold: 0, avgProgress: 0 });
    } catch (error) {
        console.error('Failed to get stats:', error);
        res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
    }
};

module.exports = {
    getAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    addDailyWorkLog,
    deleteDailyWorkLog,
    getStats
};
