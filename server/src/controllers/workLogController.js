const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getCycleStartDateIST, getCycleEndDateIST, getStartOfDayIST, getEndOfDayIST } = require('../utils/dateHelpers');

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
                const hasExistingOpening = existingLog.ae_opening_metrics || existingLog.fa_opening_metrics || existingLog.la_opening_metrics || existingLog.cre_opening_metrics;
                if (!hasExistingOpening) {
                    const updatedLog = await prisma.workLog.update({
                        where: { id: existingLog.id },
                        data: {
                            ae_opening_metrics: typeof ae_opening_metrics === 'string' ? JSON.parse(ae_opening_metrics) : ae_opening_metrics,
                            fa_opening_metrics: typeof fa_opening_metrics === 'string' ? JSON.parse(fa_opening_metrics) : fa_opening_metrics,
                            la_opening_metrics: typeof la_opening_metrics === 'string' ? JSON.parse(la_opening_metrics) : la_opening_metrics,
                            cre_opening_metrics: typeof cre_opening_metrics === 'string' ? JSON.parse(cre_opening_metrics) : cre_opening_metrics,
                            startTime: startTime || existingLog.startTime,
                            ae_gpsCoordinates: ae_gpsCoordinates || existingLog.ae_gpsCoordinates,
                            ae_siteLocation: ae_siteLocation || existingLog.ae_siteLocation,
                            ae_siteStatus: ae_siteStatus || existingLog.ae_siteStatus,
                            ae_plannedWork: ae_plannedWork || existingLog.ae_plannedWork
                        }
                    });
                    return res.json(updatedLog);
                }
                return res.status(400).json({ message: 'You already have an open work log for today.' });
            }
            // If one exists and it's closed, block new creation
            if (existingLog.logStatus === 'CLOSED') {
                return res.status(400).json({ message: 'You have already submitted a work log for today.' });
            }
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
                cre_synced_calls: typeof req.body.cre_synced_calls === 'string' ? JSON.parse(req.body.cre_synced_calls) : req.body.cre_synced_calls,
                notes: notes,

                date: new Date(),
                logStatus: req.body.logStatus || 'CLOSED', // Default to CLOSED if not specified
                startTime: startTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
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

        // Enforce project-wise report check strictly for LA designation only
        const designation = (req.user.designation || '').toUpperCase();
        const role = (req.user.role || '').toUpperCase();
        const isLA = role.includes('LA') || designation.includes('LA') || designation.includes('ARCHITECT');

        if (isLA) {
            let reports = [];
            if (existingLog.la_project_reports) {
                reports = typeof existingLog.la_project_reports === 'string'
                    ? JSON.parse(existingLog.la_project_reports)
                    : existingLog.la_project_reports;
            }

            if (!Array.isArray(reports) || reports.length === 0) {
                return res.status(400).json({
                    message: 'You must add at least one Project Wise report before submitting your closing report.'
                });
            }
        }

        const updatedLog = await prisma.workLog.update({
            where: { id: existingLog.id },
            data: {
                logStatus: 'CLOSED',
                cre_closing_metrics: typeof cre_closing_metrics === 'string' ? JSON.parse(cre_closing_metrics) : (cre_closing_metrics ? cre_closing_metrics : undefined),
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
                } : undefined,
                process: process || undefined,
                remarks: remarks || undefined,
                cre_synced_calls: typeof req.body.cre_synced_calls === 'string' ? JSON.parse(req.body.cre_synced_calls) : req.body.cre_synced_calls,
                notes: notes || undefined,
                endTime: req.body.endTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            }
        });

        res.json(updatedLog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update an active/open work log during the day (Midday tasks/notes update without closing)
// @route   PUT /api/worklogs/update
// @access  Private (Employee)
const updateWorkLog = async (req, res) => {
    const { customFields, notes, tasks, process, remarks } = req.body;

    try {
        const userId = req.user.id;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Find today's OPEN log
        const existingLog = await prisma.workLog.findFirst({
            where: {
                userId,
                date: { gte: startOfDay, lte: endOfDay },
                logStatus: 'OPEN'
            }
        });

        if (!existingLog) {
            return res.status(404).json({ message: 'No open work log found for today to update.' });
        }

        const updatedLog = await prisma.workLog.update({
            where: { id: existingLog.id },
            data: {
                customFields: customFields !== undefined ? customFields : existingLog.customFields,
                notes: notes !== undefined ? notes : existingLog.notes,
                tasks: tasks !== undefined ? tasks : existingLog.tasks,
                process: process !== undefined ? process : existingLog.process,
                remarks: remarks !== undefined ? remarks : existingLog.remarks
            }
        });

        res.json(updatedLog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Add a Project Report to a daily work log (can add anytime: now or later)
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

        let existingLog = await prisma.workLog.findFirst({
            where: {
                userId,
                date: { gte: startOfDay, lte: endOfDay }
            }
        });

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

        const designation = (req.user.designation || '').toUpperCase();
        const role = (req.user.role || '').toUpperCase();
        const isAE = role.includes('AE') || designation.includes('AE') || designation.includes('AREA EXECUTIVE');
        const isFA = role.includes('FA') || designation.includes('FA');

        if (!existingLog) {
            // Auto-create OPEN log for today if employee is adding project report before opening report
            const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const createData = {
                userId,
                date: new Date(),
                logStatus: 'OPEN',
                startTime: currentTime
            };

            if (isAE) {
                createData.ae_project_reports = [report];
            } else if (isFA) {
                createData.fa_project_reports = [report];
            } else {
                createData.la_project_reports = [report];
            }

            const newLog = await prisma.workLog.create({
                data: createData
            });

            await prisma.user.update({
                where: { id: userId },
                data: { lastWorkLogDate: new Date() },
            });

            return res.json(newLog);
        }

        // Determine which field to update based on user designation / role
        const updateData = {};

        if (isAE) {
            let existingAE = existingLog.ae_project_reports || [];
            if (typeof existingAE === 'string') existingAE = JSON.parse(existingAE);
            if (!Array.isArray(existingAE)) existingAE = [];
            existingAE.push(report);
            updateData.ae_project_reports = existingAE;
        } else if (isFA) {
            let existingFA = existingLog.fa_project_reports || [];
            if (typeof existingFA === 'string') existingFA = JSON.parse(existingFA);
            if (!Array.isArray(existingFA)) existingFA = [];
            existingFA.push(report);
            updateData.fa_project_reports = existingFA;
        } else {
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
        const { startDate, endDate } = req.query;

        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            start = getCycleStartDateIST();
            end = getCycleEndDateIST();
        }

        const logs = await prisma.workLog.findMany({
            where: {
                userId,
                date: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { date: 'desc' }
        });

        // Merge call counts from the CallLog table into the WorkLog response
        // so that manual worklogs still "reflect" the synced data in reports.
        const workLogDates = logs.map(l => l.date);
        const callSummary = await prisma.callLog.findMany({
            where: {
                userId,
                date: { in: workLogDates }
            }
        });

        const callMap = callSummary.reduce((acc, log) => {
            acc[log.date.toISOString().split('T')[0]] = log.totalCalls || 0;
            return acc;
        }, {});

        const mergedLogs = logs.map(log => ({
            ...log,
            cre_totalCalls: callMap[log.date.toISOString().split('T')[0]] || log.cre_totalCalls || 0
        }));

        res.json(mergedLogs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Sync Call Logs separately
// @route   PUT /api/worklogs/sync-calls
// @access  Private (CRE)
const syncCallLogs = async (req, res) => {
    const { logs, calls, date, syncDate, simFilter, replaceExistingForSim } = req.body;
    const incomingData = calls || logs || [];

    try {
        const userId = parseInt(req.user.id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Invalid User ID' });
        }
        let rawLogs = typeof incomingData === 'string' ? JSON.parse(incomingData) : incomingData;
        rawLogs = Array.isArray(rawLogs) ? rawLogs : [];
        const rawReceived = rawLogs.length;
        const normalizeText = (value) => String(value || "").trim().toLowerCase();
        const simFilterUpper = String(simFilter || '').trim().toUpperCase();
        const isAllSims = !simFilter || simFilterUpper === '0' || simFilterUpper === 'ALL' || simFilterUpper === 'BOTH';

        const canonicalSimSlot = !isAllSims ? String(simFilter).trim().replace(/^(sim|slot)\s*/i, '') : null;
        const normalizeAcceptedLog = (log) => {
            const normalized = { ...log };
            const existingSlot = String(normalized.simSlot || '').trim().toLowerCase().replace(/^(sim|slot)\s*/i, '');
            if (canonicalSimSlot && (existingSlot === '' || existingSlot === '0' || existingSlot === 'unknown' || existingSlot === 'undefined')) {
                normalized.simSlot = canonicalSimSlot;
            }
            return normalized;
        };

        const matchesSelectedSim = (log, target) => {
            if (!target || isAllSims) return true;
            const normalizedTarget = normalizeText(target).replace(/^(sim|slot)\s*/i, '');
            const logSlot = normalizeText(log.simSlot).replace(/^(sim|slot)\s*/i, '');
            const logId = normalizeText(log.simId);
            const logLabel = normalizeText(log.simLabel);

            if (logSlot === normalizedTarget || logId === normalizedTarget) return true;
            if (logLabel && (logLabel.includes(`sim ${normalizedTarget}`) || logLabel.includes(`slot ${normalizedTarget}`))) return true;
            // If the incoming log doesn't specify a distinct other slot (0/unknown/empty), accept it under this official SIM
            if (!logSlot || logSlot === '0' || logSlot === 'unknown' || logSlot === 'undefined') return true;
            return false;
        };

        // Normalize first so slot 0/unknown is properly attributed to the device's designated official SIM
        let newLogs = rawLogs.map(normalizeAcceptedLog);
        if (!isAllSims) {
            newLogs = newLogs.filter(log => matchesSelectedSim(log, simFilter));
            console.log(`[Sync Guard] User ${userId}: Filtered ${rawLogs.length} down to ${newLogs.length} logs for SIM ${simFilter}`);
        }

        // HEARTBEAT LOGIC: Only true if the device actually sent 0 raw logs (a heartbeat ping) or nothing left after processing
        const isHeartbeat = rawReceived === 0 || !newLogs || newLogs.length === 0;
        
        const user = await prisma.user.findUnique({ 
            where: { id: parseInt(userId) }, 
            select: { name: true, role: true, designation: true, callAnalyticsViewEnabled: true } 
        });

        const isAE = user?.role === 'AE' ||
                     (user?.designation && (
                         user.designation.toUpperCase().includes('AE') || 
                         user.designation.toUpperCase().includes('ARCHITECT')
                     ));

        if (isAE) {
            console.log(`[Call Sync Blocked] Ignoring call log sync for AE user ${userId} (${user?.name || 'No User'})`);
            return res.status(200).json({ 
                message: 'Call sync is disabled for AE / this employee role',
                totalCalls: 0,
                acceptedLogs: 0,
                rawReceived: rawLogs.length 
            });
        }

        console.log(`[Sync] User ${userId} (${user?.name || "No User"}) syncing ${isHeartbeat ? '0 (Heartbeat)' : newLogs.length} logs. SIM Filter: ${simFilter}`);

        if (isHeartbeat) {
            const todayIST = getStartOfDayIST();
            await prisma.callLog.upsert({
                where: { userId_date: { userId, date: todayIST } },
                update: { updatedAt: new Date() }, // Force update timestamp
                create: {
                    userId,
                    date: todayIST,
                    calls: [],
                    totalCalls: 0
                }
            });
            return res.json({
                message: 'Sync heartbeat successful',
                totalCalls: 0,
                rawReceived,
                acceptedLogs: 0,
                persistedDays: 0
            });
        }

        // Group logs by Date (YYYY-MM-DD) - IST Aware (UTC+5:30)
        let invalidDateCount = 0;
        let groupedLogs = newLogs.reduce((acc, log) => {
            let timestamp = log.date || syncDate || Date.now();
            
            // Handle some plugins returning seconds instead of ms (10-digit)
            if (typeof timestamp === 'number' && timestamp < 10000000000) {
                timestamp = timestamp * 1000;
            } else if (typeof timestamp === 'string') {
                const num = Number(timestamp.trim());
                if (!isNaN(num) && num > 0) {
                    timestamp = num < 10000000000 ? num * 1000 : num;
                }
            }

            // Normalization: Ensure the object itself has the ms timestamp
            log.date = timestamp;

            const d = new Date(timestamp);
            if (isNaN(d.getTime())) {
                console.warn("[Sync] Invalid date encountered:", timestamp);
                invalidDateCount++;
                return acc;
            }

            // Convert to IST (UTC+5:30) for grouping
            const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
            const dateStr = istDate.toISOString().split('T')[0];
            
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(log);
            return acc;
        }, {});

        const results = [];

        // Process each day group
        for (const [dateStr, dayLogs] of Object.entries(groupedLogs)) {
            const targetDate = getStartOfDayIST(dateStr);

            const existingCallLog = await prisma.callLog.findUnique({
                where: { userId_date: { userId, date: targetDate } }
            });

            let consolidatedLogs = [];
            if (existingCallLog) {
                // ALWAYS preserve existing calls and merge new calls - NEVER wipe out earlier calls of the day!
                consolidatedLogs = Array.isArray(existingCallLog.calls) ? [...existingCallLog.calls] : [];

                const cleanNum = (num) => String(num || "").replace(/\D/g, "").slice(-10);
                const getTs = (l) => {
                    const raw = l.date ?? l.timestamp ?? l.time;
                    const n = Number(raw);
                    if (!isNaN(n) && n > 0) return n < 10000000000 ? n * 1000 : n;
                    const d = new Date(raw).getTime();
                    return isNaN(d) ? 0 : d;
                };

                const findExistingIndex = (newLog) => {
                    const newNum = cleanNum(newLog.number);
                    const newTs = getTs(newLog);
                    const newType = String(newLog.type || '').toUpperCase();

                    return consolidatedLogs.findIndex(ext => {
                        const extNum = cleanNum(ext.number);
                        if (newNum && extNum && newNum !== extNum) return false;
                        
                        const extTs = getTs(ext);
                        if (newTs > 0 && extTs > 0 && Math.abs(newTs - extTs) > 3000) return false;

                        const extType = String(ext.type || '').toUpperCase();
                        if (newType && extType && newType !== extType) return false;

                        return true;
                    });
                };

                let addedCount = 0;
                let updatedCount = 0;
                dayLogs.forEach(log => {
                    const normalizedLog = normalizeAcceptedLog(log);
                    const existingIdx = findExistingIndex(normalizedLog);

                    if (existingIdx !== -1) {
                        const existing = consolidatedLogs[existingIdx];
                        if (normalizedLog.duration && (!existing.duration || existing.duration === 0)) {
                            existing.duration = normalizedLog.duration;
                            updatedCount++;
                        }
                        if (normalizedLog.simSlot && (!existing.simSlot || existing.simSlot === '0')) {
                            existing.simSlot = normalizedLog.simSlot;
                            updatedCount++;
                        }
                        if (normalizedLog.simLabel && !existing.simLabel) {
                            existing.simLabel = normalizedLog.simLabel;
                        }
                    } else {
                        consolidatedLogs.push(normalizedLog);
                        addedCount++;
                    }
                });
                console.log(`[Sync] User ${userId} for ${dateStr}: Preserved ${existingCallLog.calls.length} existing calls, merged ${addedCount} new calls.`);
            } else {
                consolidatedLogs = dayLogs.map(normalizeAcceptedLog);
                console.log(`[Sync] User ${userId} for ${dateStr}: Creating new record with ${dayLogs.length} logs.`);
            }

            const updatedLog = await prisma.callLog.upsert({
                where: { userId_date: { userId, date: targetDate } },
                update: {
                    calls: consolidatedLogs,
                    totalCalls: consolidatedLogs.length
                },
                create: {
                    userId,
                    date: targetDate,
                    calls: consolidatedLogs,
                    totalCalls: consolidatedLogs.length
                }
            });
            results.push(updatedLog);
        }

        const totalPersistedCalls = results.reduce((sum, record) => sum + (record.totalCalls || 0), 0);

        res.json({
            message: 'Call logs synced successfully',
            totalCalls: totalPersistedCalls,
            rawReceived,
            acceptedLogs: newLogs.length,
            persistedDays: results.length,
            invalidDateCount,
            latestRecord: results[results.length - 1] || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const getCallTimestamp = (c) => {
    if (!c) return null;
    const raw = c.date ?? c.timestamp ?? c.time;
    if (raw === undefined || raw === null || raw === '') return null;
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw === 'number') {
        return raw < 10000000000 ? raw * 1000 : raw;
    }
    if (typeof raw === 'string') {
        const num = Number(raw.trim());
        if (!isNaN(num) && num > 0) {
            return num < 10000000000 ? num * 1000 : num;
        }
        const parsed = new Date(raw).getTime();
        if (!isNaN(parsed)) return parsed;
    }
    return null;
};

// @desc    Get my individual call logs (CRE)
// @route   GET /api/worklogs/my-calls
// @access  Private (CRE)
const getMyCallLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, simFilter } = req.query;

        // Expanded query bounds (+/- 24 hours) to guarantee records are never clipped by UTC vs IST DB storage
        let queryStart, queryEnd;
        if (startDate && endDate) {
            queryStart = new Date(getStartOfDayIST(startDate).getTime() - (24 * 60 * 60 * 1000));
            queryEnd = new Date(getEndOfDayIST(endDate).getTime() + (24 * 60 * 60 * 1000));
        } else {
            const defaultStart = getCycleStartDateIST();
            const defaultEnd = getCycleEndDateIST();
            queryStart = new Date(defaultStart.getTime() - (24 * 60 * 60 * 1000));
            queryEnd = new Date(defaultEnd.getTime() + (24 * 60 * 60 * 1000));
        }

        const logs = await prisma.callLog.findMany({
            where: {
                userId,
                date: {
                    gte: queryStart,
                    lte: queryEnd
                }
            },
            orderBy: { date: 'desc' }
        });

        // Filter inner calls by specific date and SIM in IST (UTC+5:30) with timezone boundary grace
        const processedLogs = logs.map(log => {
            let filteredCalls = Array.isArray(log.calls) ? [...log.calls] : [];

            if (startDate && endDate) {
                const s = getStartOfDayIST(startDate).getTime();
                const e = getEndOfDayIST(endDate).getTime();
                const logDateTs = log.date ? new Date(log.date).getTime() : null;
                const isParentLogInRange = logDateTs !== null && logDateTs >= s && logDateTs <= e;

                filteredCalls = filteredCalls.filter(c => {
                    const ts = getCallTimestamp(c);
                    if (ts === null) return isParentLogInRange;
                    if (ts >= s && ts <= e) return true;
                    // Grace window if call belongs to today's parent log
                    if (isParentLogInRange && ts >= (s - 6 * 3600 * 1000) && ts <= (e + 6 * 3600 * 1000)) {
                        return true;
                    }
                    return false;
                });
            }

            if (simFilter && String(simFilter).toUpperCase() !== 'ALL' && String(simFilter) !== '0') {
                const slot = String(simFilter).toLowerCase().replace(/^(sim|slot)\s*/i, '');
                filteredCalls = filteredCalls.filter(c => {
                    const cSlot = String(c.simSlot || c.simId || "").toLowerCase().replace(/^(sim|slot)\s*/i, '');
                    const cLabel = String(c.simLabel || "").toLowerCase().replace(/^(sim|slot)\s*/i, '');
                    return cSlot === slot || cLabel === slot || cLabel.includes(`sim ${slot}`) || cLabel.includes(`slot ${slot}`);
                });
            }

            return {
                ...log,
                calls: filteredCalls,
                totalCalls: filteredCalls.length
            };
        });

        res.json(processedLogs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all call stats for Admin
// @route   GET /api/worklogs/call-stats
// @access  Private (Admin)
const getAllCallStats = async (req, res) => {
    try {
        const { startDate, endDate, simFilter } = req.query;

        // Expanded query bounds (+/- 24 hours) to guarantee records are never clipped by UTC vs IST DB storage
        let queryStart, queryEnd;
        if (startDate && endDate) {
            queryStart = new Date(getStartOfDayIST(startDate).getTime() - (24 * 60 * 60 * 1000));
            queryEnd = new Date(getEndOfDayIST(endDate).getTime() + (24 * 60 * 60 * 1000));
        } else {
            const defaultStart = getCycleStartDateIST();
            const defaultEnd = getCycleEndDateIST();
            queryStart = new Date(defaultStart.getTime() - (24 * 60 * 60 * 1000));
            queryEnd = new Date(defaultEnd.getTime() + (24 * 60 * 60 * 1000));
        }

        const callLogs = await prisma.callLog.findMany({
            where: {
                date: { gte: queryStart, lte: queryEnd },
                user: {
                    status: 'ACTIVE',
                    NOT: [
                        { callAnalyticsViewEnabled: false },
                        { designation: { contains: 'AE', mode: 'insensitive' } },
                        { designation: { contains: 'Architect', mode: 'insensitive' } }
                    ]
                }
            },
            include: {
                user: {
                    select: {
                        name: true,
                        id: true,
                        designation: true,
                        role: true,
                        callAnalyticsViewEnabled: true,
                        callSyncDevices: {
                            where: { active: true },
                            select: { lastSuccessAt: true },
                            orderBy: { lastSuccessAt: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        // Filter inner calls by specific date and SIM slot
        const stats = callLogs.map(log => {
            let filteredCalls = Array.isArray(log.calls) ? [...log.calls] : [];

            // 1. Filter by DATE in IST (UTC+5:30) with timezone boundary grace
            if (startDate && endDate) {
                const s = getStartOfDayIST(startDate).getTime();
                const e = getEndOfDayIST(endDate).getTime();
                const logDateTs = log.date ? new Date(log.date).getTime() : null;
                const isParentLogInRange = logDateTs !== null && logDateTs >= s && logDateTs <= e;

                filteredCalls = filteredCalls.filter(c => {
                    const ts = getCallTimestamp(c);
                    if (ts === null) return isParentLogInRange;
                    if (ts >= s && ts <= e) return true;
                    // Grace window if call belongs to today's parent log
                    if (isParentLogInRange && ts >= (s - 6 * 3600 * 1000) && ts <= (e + 6 * 3600 * 1000)) {
                        return true;
                    }
                    return false;
                });
            }

            // 2. Filter by SIM if provided
            if (simFilter && String(simFilter).toUpperCase() !== 'ALL' && String(simFilter) !== '0') {
                const slot = String(simFilter).toLowerCase().replace(/^(sim|slot)\s*/i, '');
                filteredCalls = filteredCalls.filter(c => {
                    const cSlot = String(c.simSlot || c.simId || "").toLowerCase().replace(/^(sim|slot)\s*/i, '');
                    const cLabel = String(c.simLabel || "").toLowerCase().replace(/^(sim|slot)\s*/i, '');
                    return cSlot === slot || cLabel === slot || cLabel.includes(`sim ${slot}`) || cLabel.includes(`slot ${slot}`);
                });
            }

            const deviceLastSuccess = log.user?.callSyncDevices?.[0]?.lastSuccessAt;
            const effectiveLastSync = deviceLastSuccess && new Date(deviceLastSuccess) > new Date(log.updatedAt)
                ? deviceLastSuccess
                : log.updatedAt;

            return {
                id: log.id,
                date: log.date,
                lastSync: effectiveLastSync,
                user: log.user?.name || 'Unknown Personnel',
                designation: log.user?.designation || 'OTHER',
                role: log.user?.role || 'EMPLOYEE',
                userId: log.user?.id || log.userId,
                empId: `EMP-${log.user?.id || log.userId}`,
                callAnalyticsViewEnabled: log.user?.callAnalyticsViewEnabled !== false,
                calls: filteredCalls,
                totalCalls: filteredCalls.length
            };
        });

        // 3. Fetch Excluded Numbers
        const excludedSetting = await prisma.globalSetting.findUnique({
            where: { key: 'EXCLUDED_EMPLOYEE_NUMBERS' }
        });
        const excludedNumbers = excludedSetting ? excludedSetting.value.split(',').map(n => n.trim()).filter(Boolean) : [];

        res.json({ stats, excludedNumbers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createWorkLog, getMyWorkLogs, closeWorkLog, updateWorkLog, addProjectReport, syncCallLogs, getMyCallLogs, getAllCallStats };
