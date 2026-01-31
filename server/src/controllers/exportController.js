const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to convert JSON to CSV
const convertToCSV = (data, fields) => {
    const header = fields.join(',') + '\n';
    const rows = data.map(row => {
        return fields.map(field => {
            const value = row[field] || '';
            // Escape quotes and wrap in quotes if contains comma
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    }).join('\n');
    return header + rows;
};

// @desc    Export Work Logs as CSV
// @route   GET /api/export/worklogs
// @access  Private (Admin)
const exportWorkLogs = async (req, res) => {
    try {
        const { month, year, designation } = req.query;
        let where = {};

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);
            where = {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            };
        }

        if (req.user.role === 'AE_MANAGER') {
            where.user = { designation: 'AE' };
        } else if (designation) {
            where.user = {
                designation: designation
            };
        }

        const logs = await prisma.workLog.findMany({
            where,
            include: { user: { select: { name: true, email: true, designation: true } } },
            orderBy: { date: 'desc' },
        });

        const flattenedLogs = logs.map(log => {
            // Helper to format JSON lists/tables
            const formatList = (list) => Array.isArray(list) ? list.join('; ') : '';
            const formatTable = (table) => Array.isArray(table) ? JSON.stringify(table) : '';

            // Helper to safely parse JSON
            const safeParse = (data) => {
                if (!data) return null;
                if (typeof data === 'object') return data;
                try { return JSON.parse(data); } catch (e) { return null; }
            };


            const aeOpening = safeParse(log.ae_opening_metrics);
            const aeClosing = safeParse(log.ae_closing_metrics);

            const creOpening = safeParse(log.cre_opening_metrics);
            const creClosing = safeParse(log.cre_closing_metrics);

            const faOpening = safeParse(log.fa_opening_metrics);
            const faClosing = safeParse(log.fa_closing_metrics);

            const laOpening = safeParse(log.la_opening_metrics);
            const laClosing = safeParse(log.la_closing_metrics);
            const laReports = safeParse(log.la_project_reports);


            return {
                Employee: log.user.name,
                Email: log.user.email,
                Designation: log.user.designation,
                Date: new Date(log.date).toLocaleDateString(),

                // Common / Legacy
                Project: log.projectName || log.project?.name || '',
                Client: log.clientName || '',
                Site: log.site || '',
                Process: log.process || log.tasks || '', // Legacy
                Hours: log.hours || '',
                StartTime: log.startTime || '',
                EndTime: log.endTime || '',
                ImageCount: log.imageCount || '',


                // --- OPENING (START OF DAY) ---
                'Op_PlannedWork': aeOpening?.ae_plannedWork || log.ae_plannedWork || '',
                'Op_SiteLocation': aeOpening?.ae_siteLocation || log.ae_siteLocation || '',
                'Op_SiteStatus': aeOpening?.ae_siteStatus || log.ae_siteStatus || '',
                'Op_GPS': aeOpening?.ae_gpsCoordinates || log.ae_gpsCoordinates || '',

                // CRE Opening
                'Op_CRE_ShowroomVisit': creOpening?.showroomVisit || '',
                'Op_CRE_OnlineDisc': creOpening?.onlineDiscussion || '',
                'Op_CRE_FPReceived': creOpening?.fpReceived || '',
                'Op_CRE_FQSent': creOpening?.fqSent || '',
                'Op_CRE_Orders': creOpening?.noOfOrder || '',
                'Op_CRE_Proposals': creOpening?.noOfProposalIQ || '',

                // FA Opening
                'Op_FA_ShowroomVisit': faOpening?.showroomVisit || '',
                'Op_FA_OnlineDisc': faOpening?.onlineDiscussion || '',
                'Op_FA_QuotesPending': faOpening?.quotationPending || '',
                'Op_FA_9Star': faOpening?.calls?.nineStar || '',

                // LA Opening
                'Op_LA_Initial2D': laOpening?.initial2D?.count || '',
                'Op_LA_Prod2D': laOpening?.production2D?.count || '',
                'Op_LA_Fresh3D': laOpening?.fresh3D?.count || '',

                // --- CLOSING (END OF DAY) ---
                'Cl_VisitType': (() => {
                    if (aeClosing?.ae_visitType) return Array.isArray(aeClosing.ae_visitType) ? aeClosing.ae_visitType.join(', ') : aeClosing.ae_visitType;
                    if (log.ae_visitType) return Array.isArray(log.ae_visitType) ? log.ae_visitType.join(', ') : log.ae_visitType;
                    return '';
                })(),
                'Cl_WorkStage': aeClosing?.ae_workStage || log.ae_workStage || '',
                'Cl_Measurements': aeClosing?.ae_measurements || log.ae_measurements || '',
                'Cl_ItemsInstalled': aeClosing?.ae_itemsInstalled || log.ae_itemsInstalled || '',
                'Cl_HasIssues': aeClosing?.ae_hasIssues ? 'Yes' : 'No',
                'Cl_IssueDesc': aeClosing?.ae_issueDescription || log.ae_issueDescription || '',
                'Cl_ClientFeedback': aeClosing?.ae_clientFeedback || log.ae_clientFeedback || '',
                'Cl_Remarks': log.remarks || '',

                // CRE Closing
                'Cl_CRE_FloorPlanRx': creClosing?.floorPlanReceived || '',
                'Cl_CRE_ShowroomVisit': creClosing?.showroomVisit || '',
                'Cl_CRE_Reviews': creClosing?.reviewCollected || '',
                'Cl_CRE_QuotesSent': creClosing?.quotesSent || '',
                'Cl_CRE_Proposals': creClosing?.proposalCount || '',
                'Cl_CRE_Orders': creClosing?.orderCount || '',
                'Cl_CRE_8Star': creClosing?.eightStar || '',

                // FA Closing
                'Cl_FA_ShowroomVisit': faClosing?.showroomVisit || '',
                'Cl_FA_OnlineDisc': faClosing?.onlineDiscussion || '',
                'Cl_FA_QuotesPending': faClosing?.quotationPending || '',
                'Cl_FA_InfurniaCount': faClosing?.infurniaPending?.count || '',
                'Cl_FA_Call9Star': faClosing?.calls?.nineStar || '',

                // LA Closing
                'Cl_LA_Initial2D': laClosing?.initial2D?.count || '',
                'Cl_LA_Prod2D': laClosing?.production2D?.count || '',
                'Cl_LA_Fresh3D': laClosing?.fresh3D?.count || '',
                'Cl_LA_ProjectReports': (() => {
                    if (!laReports) return '';
                    if (Array.isArray(laReports)) {
                        return laReports.map(r => `${r.clientName} (${r.process}): ${r.completedImages}/${r.imageCount}`).join('; ');
                    }
                    return '';
                })(),

                // Legacy Field Fallbacks (Keep just in case)
                CRE_TotalCalls: log.cre_totalCalls || '',
                CRE_CallBreakdown: log.cre_callBreakdown || '',
                FA_Calls: log.fa_calls || '',

                FA_SiteVisits: log.fa_siteVisits || '',
                FA_DesignPending: log.fa_designPending || '',
                FA_DesignPendingClients: log.fa_designPendingClients || '',
                FA_QuotePending: log.fa_quotePending || '',
                FA_QuotePendingClients: log.fa_quotePendingClients || '',

                // LA Fields
                LA_Number: log.la_number || '',
                LA_Location: log.la_projectLocation || '',
                LA_Value: log.la_projectValue || '',
                LA_Status: log.la_siteStatus || '',
                LA_Requirements: formatList(log.la_requirements),
                LA_Colours: formatList(log.la_colours),

                SubmittedAt: new Date(log.createdAt).toLocaleString(),
            };
        });


        // Define Column Groups
        const baseColumns = ['Employee', 'Email', 'Designation', 'Date', 'Project', 'Client', 'Site', 'Hours', 'StartTime', 'EndTime', 'ImageCount', 'SubmittedAt'];

        const aeColumns = [
            'Op_PlannedWork', 'Op_SiteLocation', 'Op_SiteStatus', 'Op_GPS',
            'Cl_VisitType', 'Cl_WorkStage', 'Cl_Measurements', 'Cl_ItemsInstalled',
            'Cl_HasIssues', 'Cl_IssueDesc', 'Cl_ClientFeedback', 'Cl_Remarks'
        ];

        const creColumns = [
            'Op_CRE_ShowroomVisit', 'Op_CRE_OnlineDisc', 'Op_CRE_FPReceived', 'Op_CRE_FQSent', 'Op_CRE_Orders', 'Op_CRE_Proposals',
            'Cl_CRE_FloorPlanRx', 'Cl_CRE_ShowroomVisit', 'Cl_CRE_Reviews', 'Cl_CRE_QuotesSent', 'Cl_CRE_Proposals', 'Cl_CRE_Orders', 'Cl_CRE_8Star',
            'CRE_TotalCalls', 'CRE_CallBreakdown'
        ];

        const faColumns = [
            'Op_FA_ShowroomVisit', 'Op_FA_OnlineDisc', 'Op_FA_QuotesPending', 'Op_FA_9Star',
            'Cl_FA_ShowroomVisit', 'Cl_FA_OnlineDisc', 'Cl_FA_QuotesPending', 'Cl_FA_InfurniaCount', 'Cl_FA_Call9Star',
            'FA_Calls', 'FA_SiteVisits'
        ];

        const laColumns = [
            'Op_LA_Initial2D', 'Op_LA_Prod2D', 'Op_LA_Fresh3D',
            'Cl_LA_Initial2D', 'Cl_LA_Prod2D', 'Cl_LA_Fresh3D', 'Cl_LA_ProjectReports',
            'LA_Number', 'LA_Location', 'LA_Value', 'LA_Status', 'LA_Requirements', 'LA_Colours'
        ];

        // Determine which fields to include
        let csvFields = [];

        // Check the effective designation filter (from query or role)
        const effectiveDesignation = (req.user.role === 'AE_MANAGER') ? 'AE' : designation;

        if (effectiveDesignation === 'AE') {
            csvFields = [...baseColumns, ...aeColumns];
        } else if (effectiveDesignation === 'CRE') {
            csvFields = [...baseColumns, ...creColumns];
        } else if (effectiveDesignation === 'FA') {
            csvFields = [...baseColumns, ...faColumns];
        } else if (effectiveDesignation === 'LA') {
            csvFields = [...baseColumns, ...laColumns];
        } else {
            // Default: Include All (but maybe grouped logically)
            csvFields = [
                ...baseColumns,
                ...aeColumns,
                ...creColumns,
                ...faColumns,
                ...laColumns
            ];
        }

        const csv = convertToCSV(flattenedLogs, csvFields);

        res.header('Content-Type', 'text/csv');
        const filename = month && year ? `worklogs_${year}_${month}.csv` : 'worklogs_all.csv';
        res.attachment(filename);
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export Attendance as CSV
// @route   GET /api/export/attendance
// @access  Private (Admin)
// @desc    Export Attendance as CSV
// @route   GET /api/export/attendance
// @access  Private (Admin)
const exportAttendance = async (req, res) => {
    try {
        let attendanceWhere = {};
        let userWhere = { status: 'ACTIVE' };

        if (req.user.role === 'AE_MANAGER') {
            attendanceWhere = { user: { designation: 'AE' } };
            userWhere.designation = 'AE';
        }

        const [records, activeUsers] = await Promise.all([
            prisma.attendance.findMany({
                where: attendanceWhere,
                include: { user: { select: { name: true, email: true, designation: true } } },
                orderBy: { date: 'asc' },
            }),
            prisma.user.findMany({
                where: userWhere,
                select: { id: true, name: true, email: true, designation: true }
            })
        ]);

        // Group by User + Date
        const groupedMap = new Map();
        const uniqueDates = new Set();

        const host = req.get('host');
        const protocol = req.protocol;
        const baseUrl = `${protocol}://${host}`;

        records.forEach(record => {
            const dateObj = new Date(record.date);
            const dateStr = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
            uniqueDates.add(dateStr);
            const key = `${record.userId}_${dateStr}`;

            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    Employee: record.user.name,
                    Email: record.user.email,
                    Designation: record.user.designation || 'N/A',
                    Date: dateStr,
                    firstLogin: dateObj,
                    lastLogout: null,
                    totalMs: 0,
                    status: record.status,
                    hasActiveSession: false,
                    hasActiveSession: false,
                    sessionCount: 0,
                    sessionLogs: [],
                    sessionPhotos: []
                });
            }

            const group = groupedMap.get(key);
            group.sessionCount++;

            // Update Start Time (Earliest)
            if (dateObj < group.firstLogin) {
                group.firstLogin = dateObj;
            }

            // Calculate Duration & Update End Time
            if (record.checkoutTime) {
                const checkoutObj = new Date(record.checkoutTime);

                // Add to total duration
                group.totalMs += (checkoutObj - dateObj);

                // Update Last Logout (Latest)
                if (!group.lastLogout || checkoutObj > group.lastLogout) {
                    group.lastLogout = checkoutObj;
                }
            } else {
                group.hasActiveSession = true;
            }

            const inTime = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
            const outTime = record.checkoutTime ? new Date(record.checkoutTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Active';

            const inPhoto = record.checkInPhoto ? `${baseUrl}${record.checkInPhoto}` : 'No Photo';
            const outPhoto = record.checkoutPhoto ? `${baseUrl}${record.checkoutPhoto}` : 'No Photo';

            group.sessionLogs.push(`${inTime} - ${outTime}`);
            group.sessionPhotos.push(`In: ${inPhoto} | Out: ${outPhoto}`);

        });

        // Fill in ABSENT records
        uniqueDates.forEach(dateStr => {
            activeUsers.forEach(user => {
                const key = `${user.id}_${dateStr}`;
                if (!groupedMap.has(key)) {
                    groupedMap.set(key, {
                        Employee: user.name,
                        Email: user.email,
                        Designation: user.designation || 'N/A',
                        Date: dateStr,
                        firstLogin: null,
                        lastLogout: null,
                        totalMs: 0,
                        status: 'ABSENT',
                        hasActiveSession: false,
                        sessionCount: 0,
                        sessionCount: 0,
                        sessionLogs: [],
                        sessionPhotos: []
                    });
                }
            });
        });

        const flattenedRecords = Array.from(groupedMap.values()).map(group => {
            const totalHours = (group.totalMs / (1000 * 60 * 60)).toFixed(2);

            return {
                Employee: group.Employee,
                Email: group.Email,
                Designation: group.Designation,
                Date: group.Date,
                'Log In': group.firstLogin ? group.firstLogin.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
                'Log Out': group.hasActiveSession ? '-' : (group.lastLogout ? group.lastLogout.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'),
                'Total Working Hours': group.status === 'ABSENT' ? '-' : totalHours,
                'Sessions': group.sessionCount === 0 ? '-' : group.sessionCount,
                'Session Details': group.sessionLogs.length > 0 ? group.sessionLogs.join(' | ') : '-',
                'Photo Evidence': group.sessionPhotos.length > 0 ? group.sessionPhotos.join(' || ') : '-',
                Status: group.status,
            };
        });

        // Sort by Date Descending
        flattenedRecords.sort((a, b) => new Date(b.Date) - new Date(a.Date));

        const csv = convertToCSV(flattenedRecords, ['Employee', 'Email', 'Designation', 'Date', 'Log In', 'Log Out', 'Total Working Hours', 'Sessions', 'Session Details', 'Photo Evidence', 'Status']);

        res.header('Content-Type', 'text/csv');
        res.attachment('attendance.csv');
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export Requests (Leaves, Permissions, Visits) as CSV
// @route   GET /api/export/requests
// @access  Private (Admin/HR)
const exportRequests = async (req, res) => {
    try {
        const { status } = req.query; // Optional filter: ?status=PENDING
        let where = {};
        if (status) {
            where.status = status;
        }

        // Fetch all types
        const [leaves, permissions, siteVisits, showroomVisits] = await Promise.all([
            prisma.leaveRequest.findMany({ where, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
            prisma.permissionRequest.findMany({ where, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
            prisma.siteVisitRequest.findMany({ where, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
            prisma.showroomVisitRequest.findMany({ where, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } })
        ]);

        const combined = [
            ...leaves.map(r => ({ ...r, type: 'Leave' })),
            ...permissions.map(r => ({ ...r, type: 'Permission' })),
            ...siteVisits.map(r => ({ ...r, type: 'Site Visit' })),
            ...showroomVisits.map(r => ({ ...r, type: 'Showroom Visit' }))
        ];

        // Sort by CreatedAt desc
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const flattened = combined.map(req => {
            let duration = '';
            if (req.type === 'Leave') {
                duration = `${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}`;
            } else if (req.type === 'Permission') {
                duration = `${new Date(req.date).toLocaleDateString()} (${req.startTime} - ${req.endTime})`;
            } else if (req.type === 'Site Visit' || req.type === 'Showroom Visit') {
                duration = `${new Date(req.date).toLocaleDateString()} (${req.startTime} - ${req.endTime})`;
            }

            let details = '';
            if (req.type === 'Site Visit') details = `${req.location} (${req.projectName})`;
            if (req.type === 'Showroom Visit') details = `${req.sourceShowroom} -> ${req.destinationShowroom}`;

            return {
                Type: req.type,
                Employee: req.user.name,
                Email: req.user.email,
                'Date / Duration': duration,
                Details: details,
                Reason: req.reason,
                'Overall Status': req.status,
                'BH Status': req.bhStatus,
                'HR Status': req.hrStatus,
                RequestedAt: new Date(req.createdAt).toLocaleString()
            };
        });

        const csv = convertToCSV(flattened, [
            'Type', 'Employee', 'Email', 'Date / Duration', 'Details', 'Reason', 'Overall Status', 'BH Status', 'HR Status', 'RequestedAt'
        ]);

        res.header('Content-Type', 'text/csv');
        res.attachment('requests_export.csv');
        res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { exportWorkLogs, exportAttendance, exportRequests };
