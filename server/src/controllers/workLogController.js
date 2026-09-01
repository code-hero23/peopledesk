const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getCycleStartDateIST, getCycleEndDateIST } = require('../utils/dateHelpers');

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

        const canonicalSimSlot = !isAllSims ? String(simFilter).trim() : null;
        const matchesSelectedSim = (log, target) => {
            const normalizedTarget = normalizeText(target);
            const logSlot = normalizeText(log.simSlot);
            const logId = normalizeText(log.simId);

            return (
                logSlot === normalizedTarget ||
                logId === normalizedTarget
            );
        };
        const normalizeAcceptedLog = (log) => {
            const normalized = { ...log };
            const existingSlot = String(normalized.simSlot || '').trim();
            if (canonicalSimSlot && (existingSlot === '' || existingSlot === '0' || existingSlot === 'unknown')) {
                normalized.simSlot = canonicalSimSlot;
            }
            return normalized;
        };

        let newLogs = rawLogs;
        if (!isAllSims) {
            newLogs = rawLogs.filter(log => matchesSelectedSim(log, simFilter));
            console.log(`[Sync Guard] User ${userId}: Filtered ${rawLogs.length} down to ${newLogs.length} logs for SIM ${simFilter}`);
        }
        newLogs = newLogs.map(normalizeAcceptedLog);

        // HEARTBEAT LOGIC: If no logs after filtering, still perform an upsert for "today" to update updatedAt
        const isHeartbeat = !newLogs || newLogs.length === 0;
        
        const user = await prisma.user.findUnique({ 
            where: { id: parseInt(userId) }, 
            select: { name: true, role: true, designation: true, callAnalyticsViewEnabled: true } 
        });

        const isAE = user?.role === 'AE' ||
                     (user?.designation && (
                         user.designation.toUpperCase().includes('AE') || 
                         user.designation.toUpperCase().includes('ARCHITECT')
                     ));

        if (isAE || !user?.callAnalyticsViewEnabled) {
            console.log(`[Call Sync Blocked] Ignoring call log sync for AE / disabled user ${userId} (${user?.name || 'No User'})`);
            return res.status(200).json({ 
                message: 'Call sync is disabled for AE / this employee role',
                totalCalls: 0,
                acceptedLogs: 0,
                rawReceived: rawLogs.length 
            });
        }

        console.log(`[Sync] User ${userId} (${user?.name || "No User"}) syncing ${isHeartbeat ? '0 (Heartbeat)' : newLogs.length} logs. SIM Filter: ${simFilter}`);

        if (isHeartbeat) {
            // Create a dummy group for today so the upsert loop runs and updates updatedAt
            const todayIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
            const dateStr = todayIST.toISOString().split('T')[0];
            const targetDate = new Date(dateStr);
            targetDate.setHours(0, 0, 0, 0);

            await prisma.callLog.upsert({
                where: { userId_date: { userId, date: targetDate } },
                update: { updatedAt: new Date() }, // Force update timestamp
                create: {
                    userId,
                    date: targetDate,
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
            const targetDate = new Date(dateStr);
            targetDate.setHours(0, 0, 0, 0);

            const existingCallLog = await prisma.callLog.findUnique({
                where: { userId_date: { userId, date: targetDate } }
            });

            let consolidatedLogs = [];
            if (existingCallLog) {
                const shouldReplaceExistingForSim = Boolean(replaceExistingForSim) && !isAllSims;

                if (shouldReplaceExistingForSim) {
                    consolidatedLogs = dayLogs.map(normalizeAcceptedLog);
                    console.log(`[Sync] User ${userId} for ${dateStr}: Replaced existing SIM ${simFilter} logs with ${consolidatedLogs.length} freshly filtered logs.`);
                } else {
                consolidatedLogs = Array.isArray(existingCallLog.calls) ? [...existingCallLog.calls] : [];
                if (!isAllSims) {
                    consolidatedLogs = consolidatedLogs
                        .filter(log => matchesSelectedSim(log, simFilter))
                        .map(normalizeAcceptedLog);
                }
                // Map existing logs for duplicate check and slot correction
                const existingMap = new Map(
                    consolidatedLogs.map((l, index) => [
                        `${String(l.date)}-${String(l.number)}-${String(l.type || '')}-${String(l.duration || '')}`,
                        { log: l, index }
                    ])
                );

                let addedCount = 0;
                let updatedCount = 0;
                dayLogs.forEach(log => {
                    const normalizedLog = normalizeAcceptedLog(log);
                    const key = `${String(normalizedLog.date)}-${String(normalizedLog.number)}-${String(normalizedLog.type || '')}-${String(normalizedLog.duration || '')}`;
                    
                    if (existingMap.has(key)) {
                        const existing = existingMap.get(key);
                        if (existing.log.simSlot !== normalizedLog.simSlot) {
                            consolidatedLogs[existing.index].simSlot = normalizedLog.simSlot;
                            if (normalizedLog.simLabel) {
                                consolidatedLogs[existing.index].simLabel = normalizedLog.simLabel;
                            }
                            updatedCount++;
                        }
                    } else {
                        consolidatedLogs.push(normalizedLog);
                        existingMap.set(key, { log: normalizedLog, index: consolidatedLogs.length - 1 });
                        addedCount++;
                    }
                });
                console.log(`[Sync] User ${userId} for ${dateStr}: Found ${existingCallLog.calls.length} existing, added ${addedCount} new, corrected ${updatedCount} SIM slots.`);
                }
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

// @desc    Get my individual call logs (CRE)
// @route   GET /api/worklogs/my-calls
// @access  Private (CRE)
const getMyCallLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;

        let start, end;
        if (startDate && endDate) {
            // Force local time parsing instead of UTC
            start = new Date(startDate + 'T00:00:00');
            end = new Date(endDate + 'T23:59:59.999');
        } else {
            start = getCycleStartDateIST();
            end = getCycleEndDateIST();
        }

        const logs = await prisma.callLog.findMany({
            where: {
                userId,
                date: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { date: 'desc' }
        });

        res.json(logs);
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
        // Interpret date strings with safe boundaries to prevent timezone clipping (IST vs UTC)
        let start = startDate ? new Date(startDate + 'T00:00:00') : new Date();
        start.setHours(0, 0, 0, 0);
        let startUtc = startDate ? new Date(startDate + 'T00:00:00Z') : new Date();
        let queryStart = start < startUtc ? start : startUtc;

        let end = endDate ? new Date(endDate + 'T23:59:59.999') : new Date();
        let endUtc = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
        let queryEnd = end > endUtc ? end : endUtc;

        const callLogs = await prisma.callLog.findMany({
            where: {
                date: { gte: queryStart, lte: queryEnd },
                user: {
                    NOT: [
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
            let filteredCalls = log.calls || [];

            // 1. Filter by DATE (to remove昨日 logs synced today) - IST Aware
            if (startDate && endDate) {
                const startOfIstDay = (dtStr) => {
                    const utcDate = new Date(dtStr + 'T00:00:00Z'); // Force UTC parse
                    return utcDate.getTime() - (5.5 * 60 * 60 * 1000);
                };
                
                const s = startOfIstDay(startDate);
                const e = startOfIstDay(endDate) + (24 * 60 * 60 * 1000) - 1; // End of IST day

                filteredCalls = filteredCalls.filter(c => {
                    if (!c.date) return false;
                    const timestamp = !isNaN(c.date) ? parseInt(c.date) : new Date(c.date).getTime();
                    return timestamp >= s && timestamp <= e;
                });
                
                if (log.userId === 1 || log.userId === 2 || filteredCalls.length > 0) { 
                    console.log(`[Debug] User ${log.userId}: Found ${filteredCalls.length}/${log.calls.length} calls in range.`);
                }
            }

            // 2. Filter by SIM if provided
            if (simFilter && String(simFilter) !== 'ALL' && String(simFilter) !== '0') {
                const slot = String(simFilter).toLowerCase();
                filteredCalls = filteredCalls.filter(c => {
                    const cSlot = String(c.simSlot || c.simId || "").toLowerCase();
                    const cLabel = String(c.simLabel || "").toLowerCase().replace(/^sim\s*/i, '');
                    return cSlot === slot || cLabel === slot;
                });
            }

            const deviceLastSuccess = log.user.callSyncDevices?.[0]?.lastSuccessAt;
            const effectiveLastSync = deviceLastSuccess && new Date(deviceLastSuccess) > new Date(log.updatedAt)
                ? deviceLastSuccess
                : log.updatedAt;

            return {
                id: log.id,
                date: log.date,
                lastSync: effectiveLastSync,
                user: log.user.name,
                designation: log.user.designation,
                role: log.user.role,
                userId: log.user.id,
                empId: `EMP-${log.user.id}`,
                calls: filteredCalls,
                totalCalls: filteredCalls.length
            };
        });

        // 3. Fetch Excluded Numbers
        const excludedSetting = await prisma.globalSetting.findUnique({
            where: { key: 'EXCLUDED_EMPLOYEE_NUMBERS' }
        });
        const excludedNumbers = excludedSetting ? excludedSetting.value.split(',').map(n => n.trim()) : [];

        res.json({ stats, excludedNumbers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createWorkLog, getMyWorkLogs, closeWorkLog, addProjectReport, syncCallLogs, getMyCallLogs, getAllCallStats };
