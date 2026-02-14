const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Submit a daily work log
// @route   POST /api/worklogs
// @access  Private (Employee)
const createWorkLog = async (req, res) => {
    const {
        tasks, hours, remarks, projectName, projectId,
        // Architect (LA)
        clientName, site, process, imageCount, startTime, endTime, completedImages, pendingImages,
        // CRE
        cre_totalCalls, cre_showroomVisits, cre_fqSent, cre_orders, cre_proposals, cre_callBreakdown,
        cre_opening_metrics,
        // FA
        fa_calls, fa_designPending, fa_designPendingClients, fa_quotePending, fa_quotePendingClients,
        fa_initialQuoteRn, fa_revisedQuoteRn, fa_showroomVisits, fa_showroomVisitClients, fa_showroomTime,
        fa_onlineDiscussion, fa_onlineDiscussionClients, fa_onlineTime, fa_siteVisits, fa_siteTime, fa_loadingDiscussion,
        fa_bookingFreezed, fa_bookingFreezedClients,
        fa_opening_metrics,
        // LA Detailed
        la_number, la_mailId, la_projectLocation, la_freezingAmount, la_variant, la_projectValue,
        la_woodwork, la_addOns, la_cpCode, la_source, la_fa, la_referalBonus, la_siteStatus, la_specialNote,
        la_requirements, la_colours, la_onlineMeeting, la_showroomMeeting, la_measurements,
        la_opening_metrics,
        // AE Fields
        ae_siteLocation, ae_gpsCoordinates, ae_siteStatus, ae_visitType, ae_workStage,
        ae_tasksCompleted, ae_measurements, ae_itemsInstalled, ae_issuesRaised, ae_issuesResolved,
        ae_hasIssues, ae_issueType, ae_issueDescription, ae_nextVisitRequired, ae_nextVisitDate,
        ae_opening_metrics,

        ae_plannedWork, ae_clientMet, ae_clientFeedback, ae_photos,
        // Generic
        customFields, notes
    } = req.body;


    // Validation: Require at least Process/Tasks and Hours
    // if (!tasks && !process) {
    //     return res.status(400).json({ message: 'Please provide process details' });
    // }

    try {
        const userId = req.user.id;

        // Check if a work log already exists for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const existingLog = await prisma.workLog.findFirst({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        if (existingLog) {
            // If trying to OPEN a new log but one exists
            if (req.body.logStatus === 'OPEN') {
                return res.status(400).json({ message: 'You already have a work log for today.' });
            }
            // If one exists and it's closed, block new creation
            if (existingLog.logStatus === 'CLOSED') {
                return res.status(400).json({ message: 'You have already submitted a work log for today.' });
            }
            // If exists and OPEN, and we are not specifically hitting the 'close' endpoint (this is create),
            // we might allow separate updates or just block 'create'. 
            // Better to block 'create' and force use of 'close' endpoint for closing.
            return res.status(400).json({ message: 'Work log already open. Please submit closing report.' });
        }

        const workLog = await prisma.workLog.create({
            data: {
                userId,
                tasks: tasks || process, // Fallback `tasks` to `process` if tasks is empty
                hours: parseFloat(hours || 0),
                remarks,
                projectName,
                projectId: projectId ? parseInt(projectId) : null,

                // Architect Specific
                clientName,
                site,
                process,
                imageCount: imageCount ? parseInt(imageCount) : null,
                startTime,
                endTime,
                completedImages: completedImages ? parseInt(completedImages) : null,
                pendingImages: pendingImages ? parseInt(pendingImages) : null,

                // CRE
                cre_totalCalls: cre_totalCalls ? parseInt(cre_totalCalls) : null,
                cre_showroomVisits: cre_showroomVisits ? parseInt(cre_showroomVisits) : null,
                cre_fqSent: cre_fqSent ? parseInt(cre_fqSent) : null,
                cre_orders: cre_orders ? parseInt(cre_orders) : null,
                cre_proposals: cre_proposals ? parseInt(cre_proposals) : null,
                cre_callBreakdown,
                cre_opening_metrics: typeof cre_opening_metrics === 'string' ? JSON.parse(cre_opening_metrics) : cre_opening_metrics,


                // FA
                fa_calls: fa_calls ? parseInt(fa_calls) : null,
                fa_designPending: fa_designPending ? parseInt(fa_designPending) : null,
                fa_designPendingClients,
                fa_quotePending: fa_quotePending ? parseInt(fa_quotePending) : null,
                fa_quotePendingClients,
                fa_initialQuoteRn: fa_initialQuoteRn ? parseInt(fa_initialQuoteRn) : null,
                fa_revisedQuoteRn: fa_revisedQuoteRn ? parseInt(fa_revisedQuoteRn) : null,
                fa_showroomVisits: fa_showroomVisits ? parseInt(fa_showroomVisits) : null,
                fa_showroomVisitClients,
                fa_showroomTime,
                fa_onlineDiscussion: fa_onlineDiscussion ? parseInt(fa_onlineDiscussion) : null,
                fa_onlineDiscussionClients,
                fa_onlineTime,
                fa_siteVisits: fa_siteVisits ? parseInt(fa_siteVisits) : null,
                fa_siteTime,
                fa_loadingDiscussion: fa_loadingDiscussion ? parseInt(fa_loadingDiscussion) : null,
                fa_bookingFreezed: fa_bookingFreezed ? parseInt(fa_bookingFreezed) : null,
                fa_bookingFreezedClients,
                fa_opening_metrics: typeof fa_opening_metrics === 'string' ? JSON.parse(fa_opening_metrics) : fa_opening_metrics,

                // LA Detailed
                la_number,
                la_mailId,
                la_projectLocation,
                la_freezingAmount,
                la_variant,
                la_projectValue,
                la_woodwork,
                la_addOns,
                la_cpCode,
                la_source,
                la_fa,
                la_referalBonus,
                la_siteStatus,
                la_specialNote,
                la_requirements: typeof la_requirements === 'string' ? JSON.parse(la_requirements) : la_requirements,
                la_colours: typeof la_colours === 'string' ? JSON.parse(la_colours) : la_colours,
                la_onlineMeeting: typeof la_onlineMeeting === 'string' ? JSON.parse(la_onlineMeeting) : la_onlineMeeting,
                la_showroomMeeting: typeof la_showroomMeeting === 'string' ? JSON.parse(la_showroomMeeting) : la_showroomMeeting,
                la_measurements: typeof la_measurements === 'string' ? JSON.parse(la_measurements) : la_measurements,
                la_opening_metrics: typeof la_opening_metrics === 'string' ? JSON.parse(la_opening_metrics) : la_opening_metrics,

                // AE Fields
                ae_siteLocation,
                ae_gpsCoordinates,
                ae_siteStatus,
                ae_visitType: typeof ae_visitType === 'string' ? JSON.parse(ae_visitType) : ae_visitType,
                ae_opening_metrics: typeof ae_opening_metrics === 'string' ? JSON.parse(ae_opening_metrics) : ae_opening_metrics, // NEW AE OPENING
                ae_workStage,
                ae_tasksCompleted: typeof ae_tasksCompleted === 'string' ? JSON.parse(ae_tasksCompleted) : ae_tasksCompleted,
                ae_measurements,
                ae_itemsInstalled,
                ae_issuesRaised,
                ae_issuesResolved,
                ae_hasIssues: ae_hasIssues || false,
                ae_issueType,
                ae_issueDescription,
                ae_nextVisitRequired: ae_nextVisitRequired || false,
                ae_nextVisitDate: ae_nextVisitDate ? new Date(ae_nextVisitDate) : null,
                ae_plannedWork,
                ae_clientMet: ae_clientMet || false,
                ae_clientFeedback,
                // If files are uploaded, use them; otherwise verify if ae_photos string was passed (unlikely with multer but good safety)
                ae_photos: req.files && req.files.length > 0
                    ? req.files.map(file => `/uploads/${file.filename}`)
                    : (typeof ae_photos === 'string' ? JSON.parse(ae_photos) : ae_photos),

                // Generic
                customFields: customFields ? customFields : undefined,
                notes: notes,

                date: new Date(),
                logStatus: req.body.logStatus || 'CLOSED', // Default to CLOSED if not specified
            },
        });

        // Update user's lastWorkLogDate
        await prisma.user.update({
            where: { id: userId },
            data: { lastWorkLogDate: new Date() },
        });

        res.json(workLog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Close a daily work log (Update existing OPEN log)
// @route   PUT /api/worklogs/close
// @access  Private (Employee)
const closeWorkLog = async (req, res) => {
    const {
        cre_closing_metrics,
        fa_closing_metrics,
        la_closing_metrics,
        ae_closing_metrics, // NEW AE CLOSING
        cre_totalCalls, // Added this
        customFields, // Generic
        process, // Generic
        remarks, // Generic
        notes
    } = req.body;

    try {
        const userId = req.user.id;

        // Find today's OPEN log
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const existingLog = await prisma.workLog.findFirst({
            where: {
                userId,
                date: { gte: startOfDay, lte: endOfDay },
                logStatus: 'OPEN'
            }
        });

        if (!existingLog) {
            return res.status(404).json({ message: 'No open work log found for today to close.' });
        }

        const updatedLog = await prisma.workLog.update({
            where: { id: existingLog.id },
            data: {
                logStatus: 'CLOSED',
                cre_closing_metrics: typeof cre_closing_metrics === 'string' ? JSON.parse(cre_closing_metrics) : (cre_closing_metrics ? cre_closing_metrics : undefined), // Prisma expects Json Object so if it came as Object leave it, if string parse it. Wait, Prisma Json input needs strict handling.
                // Correction: Prisma Client expects *Object* or *Array* for Json type.
                // If multipart -> String -> Parse to Object.
                // If JSON -> Object -> Use as is.
                // So: typeof === 'string' ? JSON.parse() : val.
                // But wait, my previous fix used `JSON.parse`?  Yes.
                // AND previous code used `JSON.stringify`? Yes, which was WRONG for Object input (double stringify).
                // So now:
                cre_closing_metrics: typeof cre_closing_metrics === 'string' ? JSON.parse(cre_closing_metrics) : cre_closing_metrics,
                fa_closing_metrics: typeof fa_closing_metrics === 'string' ? JSON.parse(fa_closing_metrics) : fa_closing_metrics,
                la_closing_metrics: typeof la_closing_metrics === 'string' ? JSON.parse(la_closing_metrics) : la_closing_metrics,
                ae_closing_metrics: typeof ae_closing_metrics === 'string' ? JSON.parse(ae_closing_metrics) : ae_closing_metrics,

                // Handle Photos for Closing
                ae_photos: req.files && req.files.length > 0
                    ? req.files.map(file => `/uploads/${file.filename}`)
                    : undefined,

                // Generic Updates
                customFields: customFields ? {
                    ...(existingLog.customFields && typeof existingLog.customFields === 'object' ? existingLog.customFields : {}),
                    ...customFields
                } : undefined, // Merge customFields
                process: process || undefined,
                remarks: remarks || undefined,
                notes: notes || undefined
            }
        });

        res.json(updatedLog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Add a Project Report to an OPEN work log
// @route   PUT /api/worklogs/project-report
// @access  Private (Employee)
const addProjectReport = async (req, res) => {
    const { projectReport } = req.body; // Expects a single object { clientName, site, ... }

    try {
        const userId = req.user.id;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const existingLog = await prisma.workLog.findFirst({
            where: {
                userId,
                date: { gte: startOfDay, lte: endOfDay },
                logStatus: 'OPEN'
            }
        });

        if (!existingLog) {
            return res.status(404).json({ message: 'No open work log found for today.' });
        }

        // Determine which field to update based on user designation
        const updateData = {};
        const designation = req.user.designation;

        // Parse projectReport if it comes as a string (FormData upload)
        let report = projectReport;
        if (typeof report === 'string') {
            try {
                report = JSON.parse(report);
            } catch (e) {
                console.error("Error parsing projectReport string:", e);
            }
        }

        // Attach photos if uploaded
        if (req.files && req.files.length > 0) {
            const photoPaths = req.files.map(file => `/uploads/${file.filename}`);
            report.ae_photos = [...(report.ae_photos || []), ...photoPaths];
        }

        if (designation === 'AE') {
            let existingAE = existingLog.ae_project_reports || [];
            if (typeof existingAE === 'string') existingAE = JSON.parse(existingAE);
            if (!Array.isArray(existingAE)) existingAE = [];
            existingAE.push(report);
            updateData.ae_project_reports = existingAE;
        } else if (designation === 'FA') {
            let existingFA = existingLog.fa_project_reports || [];
            if (typeof existingFA === 'string') existingFA = JSON.parse(existingFA);
            if (!Array.isArray(existingFA)) existingFA = [];
            existingFA.push(report);
            updateData.fa_project_reports = existingFA;
        } else {
            // Default to LA for backward compatibility or LA role
            let existingLA = existingLog.la_project_reports || [];
            if (typeof existingLA === 'string') existingLA = JSON.parse(existingLA);
            if (!Array.isArray(existingLA)) existingLA = [];
            existingLA.push(report);
            updateData.la_project_reports = existingLA;
        }

        const updatedLog = await prisma.workLog.update({
            where: { id: existingLog.id },
            data: updateData
        });

        res.json(updatedLog);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get my work logs
// @route   GET /api/worklogs
// @access  Private
const getMyWorkLogs = async (req, res) => {
    try {
        const userId = req.user.id;

        const logs = await prisma.workLog.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 30, // Limit to last 30 entries
        });

        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createWorkLog, getMyWorkLogs, closeWorkLog, addProjectReport };
