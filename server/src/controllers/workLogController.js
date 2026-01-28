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
        // FA
        fa_calls, fa_designPending, fa_designPendingClients, fa_quotePending, fa_quotePendingClients,
        fa_initialQuoteRn, fa_revisedQuoteRn, fa_showroomVisits, fa_showroomVisitClients,
        fa_onlineDiscussion, fa_onlineDiscussionClients, fa_siteVisits, fa_loadingDiscussion,
        fa_bookingFreezed, fa_bookingFreezedClients,
        // LA Detailed
        la_number, la_mailId, la_projectLocation, la_freezingAmount, la_variant, la_projectValue,
        la_woodwork, la_addOns, la_cpCode, la_source, la_fa, la_referalBonus, la_siteStatus, la_specialNote,
        la_requirements, la_colours, la_onlineMeeting, la_showroomMeeting, la_measurements,
        // AE Fields
        ae_siteLocation, ae_gpsCoordinates, ae_siteStatus, ae_visitType, ae_workStage,
        ae_tasksCompleted, ae_measurements, ae_itemsInstalled, ae_issuesRaised, ae_issuesResolved,
        ae_hasIssues, ae_issueType, ae_issueDescription, ae_nextVisitRequired, ae_nextVisitDate,
        ae_plannedWork, ae_clientMet, ae_clientFeedback, ae_photos
    } = req.body;

    // Validation: Require at least Process/Tasks and Hours
    // if (!tasks && !process) {
    //     return res.status(400).json({ message: 'Please provide process details' });
    // }

    try {
        const userId = req.user.id;

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
                fa_onlineDiscussion: fa_onlineDiscussion ? parseInt(fa_onlineDiscussion) : null,
                fa_onlineDiscussionClients,
                fa_siteVisits: fa_siteVisits ? parseInt(fa_siteVisits) : null,
                fa_loadingDiscussion: fa_loadingDiscussion ? parseInt(fa_loadingDiscussion) : null,
                fa_bookingFreezed: fa_bookingFreezed ? parseInt(fa_bookingFreezed) : null,
                fa_bookingFreezedClients,

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
                la_requirements: la_requirements ? JSON.stringify(la_requirements) : undefined, // Ensure JSON is handled if needed, or pass directly if Prisma handles it (usually expects object for Json type)
                la_colours: la_colours ? JSON.stringify(la_colours) : undefined,
                la_onlineMeeting: la_onlineMeeting ? JSON.stringify(la_onlineMeeting) : undefined,
                la_showroomMeeting: la_showroomMeeting ? JSON.stringify(la_showroomMeeting) : undefined,
                la_measurements: la_measurements ? JSON.stringify(la_measurements) : undefined,

                // AE Fields
                ae_siteLocation,
                ae_gpsCoordinates,
                ae_siteStatus,
                ae_visitType: ae_visitType ? JSON.stringify(ae_visitType) : undefined,
                ae_workStage,
                ae_tasksCompleted: ae_tasksCompleted ? JSON.stringify(ae_tasksCompleted) : undefined,
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
                    ? JSON.stringify(req.files.map(file => `/uploads/${file.filename}`))
                    : (ae_photos ? JSON.stringify(ae_photos) : undefined),

                date: new Date(),
            },
        });

        // Update user's lastWorkLogDate
        await prisma.user.update({
            where: { id: userId },
            data: { lastWorkLogDate: new Date() },
        });

        res.status(201).json(workLog);
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

module.exports = { createWorkLog, getMyWorkLogs };
