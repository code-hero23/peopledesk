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

        if (designation) {
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

            return {
                Employee: log.user.name,
                Email: log.user.email,
                Designation: log.user.designation,
                Date: new Date(log.date).toLocaleDateString(),

                // Common / Legacy
                Project: log.projectName || log.project?.name || '',
                Client: log.clientName || '',
                Site: log.site || '',
                Process: log.process || log.tasks || '',
                Hours: log.hours || '',
                StartTime: log.startTime || '',
                EndTime: log.endTime || '',
                ImageCount: log.imageCount || '',
                CompletedImages: log.completedImages || '',
                PendingImages: log.pendingImages || '',

                // CRE Fields
                CRE_TotalCalls: log.cre_totalCalls || '',
                CRE_CallBreakdown: log.cre_callBreakdown || '',
                CRE_ShowroomVisits: log.cre_showroomVisits || '',
                CRE_FQSent: log.cre_fqSent || '',
                CRE_Orders: log.cre_orders || '',
                CRE_Proposals: log.cre_proposals || '',

                // FA Fields
                FA_Calls: log.fa_calls || '',
                FA_SiteVisits: log.fa_siteVisits || '',
                FA_DesignPending: log.fa_designPending || '',
                FA_DesignPendingClients: log.fa_designPendingClients || '',
                FA_QuotePending: log.fa_quotePending || '',
                FA_QuotePendingClients: log.fa_quotePendingClients || '',
                FA_InitialQuoteRN: log.fa_initialQuoteRn || '',
                FA_RevisedQuoteRN: log.fa_revisedQuoteRn || '',
                FA_BookingFreezed: log.fa_bookingFreezed || '',
                FA_BookingFreezedClients: log.fa_bookingFreezedClients || '',

                // LA Fields
                LA_Number: log.la_number || '',
                LA_MailId: log.la_mailId || '',
                LA_Location: log.la_projectLocation || '',
                LA_FreezingAmount: log.la_freezingAmount || '',
                LA_Variant: log.la_variant || '',
                LA_ProjectValue: log.la_projectValue || '',
                LA_Woodwork: log.la_woodwork || '',
                LA_AddOns: log.la_addOns || '',
                LA_CPCode: log.la_cpCode || '',
                LA_Source: log.la_source || '',
                LA_FA: log.la_fa || '',
                LA_ReferralBonus: log.la_referalBonus || '',
                LA_SiteStatus: log.la_siteStatus || '',
                LA_SpecialNote: log.la_specialNote || '',
                LA_Requirements: formatList(log.la_requirements),
                LA_Colours: formatList(log.la_colours),
                LA_OnlineMeeting: formatTable(log.la_onlineMeeting),
                LA_ShowroomMeeting: formatTable(log.la_showroomMeeting),
                LA_Measurements: formatTable(log.la_measurements),

                SubmittedAt: new Date(log.createdAt).toLocaleString(),
            };
        });

        // Collect all possible keys from the first object (or manually define them to ensure order)
        const fields = [
            'Employee', 'Email', 'Designation', 'Date',
            'Project', 'Client', 'Site', 'Process', 'Hours', 'StartTime', 'EndTime',
            'CRE_TotalCalls', 'CRE_CallBreakdown', 'CRE_ShowroomVisits', 'CRE_FQSent', 'CRE_Orders', 'CRE_Proposals',
            'FA_Calls', 'FA_SiteVisits', 'FA_DesignPending', 'FA_DesignPendingClients', 'FA_QuotePending', 'FA_QuotePendingClients', 'FA_InitialQuoteRN', 'FA_RevisedQuoteRN', 'FA_BookingFreezed', 'FA_BookingFreezedClients',
            'LA_Number', 'LA_MailId', 'LA_Location', 'LA_ProjectValue', 'LA_SiteStatus', 'LA_SpecialNote', 'LA_Requirements', 'LA_Colours',
            'SubmittedAt'
        ];

        // Use keys from the first flattened log if specific dynamic keys are needed, but static list is safer for CSV structure consistency
        // Let's use Object.keys of the first item effectively, but since we map explicitly, we can just use the keys from flattenedLogs[0] if it exists,
        // or a default list. To be safe:
        const csvFields = flattenedLogs.length > 0 ? Object.keys(flattenedLogs[0]) : fields;

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
const exportAttendance = async (req, res) => {
    try {
        const records = await prisma.attendance.findMany({
            include: { user: { select: { name: true, email: true } } },
            orderBy: { date: 'desc' },
        });

        const flattenedRecords = records.map(record => {
            const loginTime = new Date(record.date);
            const logoutTime = record.checkoutTime ? new Date(record.checkoutTime) : null;
            let totalHours = '';

            if (logoutTime) {
                const diffMs = logoutTime - loginTime;
                const hours = diffMs / (1000 * 60 * 60);
                totalHours = hours.toFixed(2);
            }

            return {
                Employee: record.user.name,
                Email: record.user.email,
                Date: loginTime.toLocaleDateString(),
                'Log In': loginTime.toLocaleTimeString(),
                'Log Out': logoutTime ? logoutTime.toLocaleTimeString() : '-',
                'Total Working Hours': totalHours,
                Status: record.status,
            };
        });

        const csv = convertToCSV(flattenedRecords, ['Employee', 'Email', 'Date', 'Log In', 'Log Out', 'Total Working Hours', 'Status']);

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
