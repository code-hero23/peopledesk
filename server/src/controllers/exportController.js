const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();
const { getCycleStartDateIST, getCycleEndDateIST, getStartOfDayIST, getEndOfDayIST } = require('../utils/dateHelpers');

// Helper to safely parse JSON
const safeParse = (data) => {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try { return JSON.parse(data); } catch (e) { return null; }
};

// Helper to format values for Excel
const formatValue = (val) => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) {
        return val.map(item => {
            if (typeof item === 'object' && item !== null) {
                // If it's a typical task/log item like {description: "...", status: "..."}
                const desc = item.description || item.task || item.projectName || item.clientName || '';
                const extra = item.status || item.count || '';
                return `${desc}${extra ? ` (${extra})` : ''}`;
            }
            return String(item);
        }).filter(Boolean).join('; ');
    }
    if (typeof val === 'object') {
        const entries = Object.entries(val).filter(([k]) => !k.startsWith('_'));
        if (entries.length === 0) return '';
        return entries.map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').trim()}: ${v}`).join(' | ');
    }
    return String(val);
};

// Helper to set column widths based on content
const setAutoWidth = (data) => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.map(key => {
        let maxLen = key.length;
        data.forEach(row => {
            const val = String(row[key] || '');
            if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(maxLen + 2, 50) }; // Cap at 50 chars
    });
};

// Helper to get unique keys from array of objects for Excel header
const getHeaders = (arr) => {
    const keys = new Set();
    arr.forEach(obj => Object.keys(obj).forEach(k => keys.add(k)));
    return Array.from(keys);
};

// @desc    Export Work Logs as CSV
// @route   GET /api/export/worklogs
// @access  Private (Admin)
const exportWorkLogs = async (req, res) => {
    try {
        const { month, year, designation, userId, search, date, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        let where = {};
        let userWhere = { status: 'ACTIVE', role: 'EMPLOYEE' };

        let startDate, endDate;

        if (queryStartDate && queryEndDate) {
            startDate = new Date(queryStartDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(queryEndDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (date) {
            const d = new Date(date);
            startDate = new Date(d.setHours(0, 0, 0, 0));
            endDate = new Date(d.setHours(23, 59, 59, 999));
        } else if (month && year) {
            // Use standard cycle: 26th of (month-1) to 25th of month
            // We adjust for Date.UTC/New Date month indices
            startDate = new Date(year, month - 2, 26, 0, 0, 0);
            endDate = new Date(year, month - 1, 25, 23, 59, 59, 999);
        } else {
            // Default to current cycle if no filters provided
            startDate = getCycleStartDateIST();
            endDate = getCycleEndDateIST();
        }

        if (startDate && endDate) {
            where.date = { gte: startDate, lte: endDate };
        }

        if (userId) {
            where.userId = parseInt(userId);
            userWhere.id = parseInt(userId);
        }

        if (req.user.role === 'AE_MANAGER') {
            where.user = { designation: 'AE' };
            userWhere.designation = 'AE';
        } else if (designation) {
            where.user = { designation: designation };
            userWhere.designation = designation;
        }

        if (search) {
            where.OR = [
                { projectName: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { remarks: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } }
            ];
            userWhere.name = { contains: search, mode: 'insensitive' };
        }

        const [logs, users] = await Promise.all([
            prisma.workLog.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true, designation: true } } },
                orderBy: { date: 'desc' },
            }),
            prisma.user.findMany({
                where: userWhere,
                select: { id: true, name: true, email: true, designation: true }
            })
        ]);

        // Initialize Workbook
        const wb = XLSX.utils.book_new();

        // 1. Prepare Data for Each Sheet
        const roleLogs = { CRE: [], FA: [], LA: [], AE: [] };
        const allSummary = [];

        // Helper to process a log or create a placeholder
        const processEntries = (targetUsers, targetLogs, targetDates) => {
            targetDates.forEach(dateStr => {
                targetUsers.forEach(user => {
                    const userLogs = targetLogs.filter(l => {
                        const lDate = l.date ? new Date(l.date).toISOString().split('T')[0] : null;
                        return l.userId === user.id && lDate === dateStr;
                    });

                    if (userLogs.length > 0) {
                        userLogs.forEach(log => {
                            const entries = mapLogToEntries(log, user, dateStr);
                            allSummary.push(entries.common);
                            if (roleLogs[entries.desig]) roleLogs[entries.desig].push(entries.role);
                        });
                    } else {
                        // Placeholder for Not Submitted
                        const placeholder = {
                            Employee: user.name,
                            Email: user.email,
                            Designation: user.designation,
                            Date: dateStr,
                            'Log Status': 'NOT SUBMITTED',
                            'Start Time': '-', 'End Time': '-', 'Total Hours': '-', 'Daily Notes': '-', 'Submitted At': '-'
                        };
                        allSummary.push(placeholder);
                    }
                });
            });
        };

        const mapLogToEntries = (log, user, dateStr) => {
            const desig = user.designation || 'OTHER';
            const common = {
                Employee: user.name,
                Email: user.email,
                Designation: desig,
                Date: dateStr,
                'Log Status': log.logStatus || 'SUBMITTED',
                'Start Time': log.startTime || '',
                'End Time': log.endTime || '',
                'Total Hours': log.hours || '',
                'Daily Notes': log.remarks || log.notes || '',
                'Submitted At': new Date(log.createdAt).toLocaleString(),
            };

            // Custom Fields (Dynamic)
            if (log.customFields) {
                const cf = safeParse(log.customFields);
                Object.entries(cf).forEach(([key, val]) => {
                    common[key.replace(/([A-Z])/g, ' $1').trim()] = formatValue(val);
                });
            }

            // Project Reports (If any)
            const reportsField = desig === 'AE' ? 'ae_project_reports' : (desig === 'LA' ? 'la_project_reports' : null);
            if (reportsField && log[reportsField]) {
                const reports = safeParse(log[reportsField]);
                if (Array.isArray(reports)) {
                    common['Details (Projects)'] = reports.map(report => {
                        const r = typeof report === 'string' ? safeParse(report) : report;
                        if (desig === 'AE') {
                            const tasks = Array.isArray(r.ae_tasksCompleted) ? r.ae_tasksCompleted.join(', ') : (r.ae_tasksCompleted || '');
                            return `${r.clientName || 'Site'}: ${r.process || ''} - ${tasks} [${r.ae_siteStatus || ''}] (${r.startTime}-${r.endTime})`;
                        } else {
                            return `${r.clientName || 'Project'}: ${r.process || r.tasks || ''} - ${r.completedImages || 0}/${r.imageCount || 0} img (${r.startTime}-${r.endTime})`;
                        }
                    }).join(' | ');
                }
            }

            let roleEntry = { Employee: common.Employee, Date: common.Date, 'Log Status': common['Log Status'] };

            if (desig === 'CRE') {
                const op = safeParse(log.cre_opening_metrics);
                const cl = safeParse(log.cre_closing_metrics);
                roleEntry = {
                    ...roleEntry,
                    'Op: 7 Star': op?.uptoTodayCalls1?.sevenStar || '',
                    'Cl: 7 Star': cl?.sevenStar || '',
                    'Op: 6 Star': op?.uptoTodayCalls1?.sixStar || '',
                    'Cl: 6 Star': cl?.sixStar || '',
                    'Op: 5 Star': op?.uptoTodayCalls1?.fiveStar || '',
                    'Cl: 5 Star': cl?.fiveStar || '',
                    'Op: 4 Star': op?.uptoTodayCalls2?.fourStar || '',
                    'Cl: 4 Star': cl?.fourStar || '',
                    'Op: 3 Star': op?.uptoTodayCalls2?.threeStar || '',
                    'Cl: 3 Star': cl?.threeStar || '',
                    'Op: 2 Star': op?.uptoTodayCalls2?.twoStar || '',
                    'Cl: 2 Star': cl?.twoStar || '',
                    'Op: Showroom Visits': op?.showroomVisit || '',
                    'Cl: Showroom Visits': cl?.showroomVisit || '',
                    'Op: Online Disc': op?.onlineDiscussion || '',
                    'Cl: Online Disc': cl?.onlineDiscussion || '',
                    'Op: Site Msmt Fixed': op?.siteMsmtDiscFixed || '',
                    'Cl: Site Msmt Done': cl?.siteMsmtDisc || '',
                    'Op: FP Received': op?.fpReceived || '',
                    'Cl: FP Received': cl?.floorPlanReceived || '',
                    'Op: FQ Sent': op?.fqSent || '',
                    'Cl: FQ Sent': cl?.quotesSent || cl?.firstQuotationSent || '',
                    'Op: Orders': op?.noOfOrder || '',
                    'Cl: Orders': cl?.orderCount || '',
                    'Op: Proposals': op?.noOfProposalIQ || '',
                    'Cl: Proposals': cl?.proposalCount || '',
                    'Total Today Calls': cl?.uptoTodayCalls || log.cre_totalCalls || '',
                    'Reviews Collected': cl?.reviewCollected || '',
                    'WhatsApp Sent': cl?.whatsappSent || '',
                    '8 Star Calls': cl?.eightStar || ''
                };
            } else if (desig === 'FA') {
                const op = safeParse(log.fa_opening_metrics);
                const cl = safeParse(log.fa_closing_metrics);
                roleEntry = {
                    ...roleEntry,
                    'Op: 9 Star': op?.calls?.nineStar || '',
                    'Cl: 9 Star': cl?.calls?.nineStar || '',
                    'Op: 8 Star': op?.calls?.eightStar || '',
                    'Cl: 8 Star': cl?.calls?.eightStar || '',
                    'Op: 7 Star': op?.calls?.sevenStar || '',
                    'Cl: 7 Star': cl?.calls?.sevenStar || '',
                    'Op: Showroom Visits': op?.showroomVisit || '',
                    'Cl: Showroom Visits': cl?.showroomVisit || '',
                    'Op: Online Disc': op?.onlineDiscussion || '',
                    'Cl: Online Disc': cl?.onlineDiscussion || '',
                    'Op: Infurnia Pending': op?.infurniaPending?.count || '',
                    'Cl: Infurnia Done': cl?.infurniaPending?.count || '',
                    'Op: Quotation Pending': op?.quotationPending || '',
                    'Cl: Quotation Done': cl?.quotationPending || '',
                    'Op: Initial Quote': op?.initialQuote?.count || '',
                    'Cl: Initial Quote': cl?.initialQuote?.count || '',
                    'Cl: Initial Quote Details': cl?.initialQuote?.text || '',
                    'Op: Revised Quote': op?.revisedQuote?.count || '',
                    'Cl: Revised Quote': cl?.revisedQuote?.count || '',
                    'Cl: Revised Quote Details': cl?.revisedQuote?.text || '',
                    'Site Visits': log.fa_siteVisits || ''
                };
            } else if (desig === 'LA') {
                const op = safeParse(log.la_opening_metrics);
                const cl = safeParse(log.la_closing_metrics);
                const fields = [
                    { k: 'initial2D', l: 'Initial 2D' }, { k: 'production2D', l: 'Prod 2D' },
                    { k: 'revised2D', l: 'Revised 2D' }, { k: 'fresh3D', l: 'Fresh 3D' },
                    { k: 'revised3D', l: 'Revised 3D' }, { k: 'estimation', l: 'Estimation' },
                    { k: 'woe', l: 'WOE' }, { k: 'onlineDiscussion', l: 'Online Disc' },
                    { k: 'showroomDiscussion', l: 'Showroom Disc' }, { k: 'signFromEngineer', l: 'Sign Engr' },
                    { k: 'siteVisit', l: 'Site Visit' }, { k: 'infurnia', l: 'Infurnia' }
                ];
                fields.forEach(f => {
                    roleEntry[`Op: ${f.l}`] = op?.[f.k]?.count || '';
                    roleEntry[`Cl: ${f.l}`] = cl?.[f.k]?.count || '';
                    roleEntry[`Op: ${f.l} Details`] = op?.[f.k]?.details || '';
                    roleEntry[`Cl: ${f.l} Details`] = cl?.[f.k]?.details || '';
                });
            } else if (desig === 'AE') {
                const op = safeParse(log.ae_opening_metrics);
                const cl = safeParse(log.ae_closing_metrics);
                roleEntry = {
                    ...roleEntry,
                    'Op: Site Location': op?.ae_siteLocation || log.ae_siteLocation || '',
                    'Op: Site Status': op?.ae_siteStatus || log.ae_siteStatus || '',
                    'Op: Planned Work': op?.ae_plannedWork || log.ae_plannedWork || '',
                    'Cl: Daily Remarks': log.remarks || log.notes || '',
                };
                // AE work is mostly in project reports, which is handled in the summary column 'Details (Projects)'
            }

            return { common, role: roleEntry, desig };
        };

        // Determine Dates to show
        let datesToShow = [];
        if (date) {
            datesToShow = [new Date(date).toISOString().split('T')[0]];
        } else {
            // Unique dates from logs or the range
            const logDates = new Set(logs.map(l => l.date ? new Date(l.date).toISOString().split('T')[0] : null).filter(Boolean));
            datesToShow = Array.from(logDates).sort((a, b) => new Date(b) - new Date(a));
        }

        processEntries(users, logs, datesToShow);

        // 2. Add Sheets to Workbook
        const addSheet = (data, name) => {
            if (!data || data.length === 0) return;
            const ws = XLSX.utils.json_to_sheet(data, { header: getHeaders(data) });
            ws['!cols'] = setAutoWidth(data);
            XLSX.utils.book_append_sheet(wb, ws, name);
        };

        addSheet(allSummary, "All_Logs_Summary");
        addSheet(roleLogs.CRE, "CRE_Logs");
        addSheet(roleLogs.FA, "FA_Logs");
        addSheet(roleLogs.LA, "LA_Logs");
        addSheet(roleLogs.AE, "AE_Logs");

        // 3. Write and Send
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const filename = month && year ? `worklogs_${year}_${month}.xlsx` : 'worklogs_all.xlsx';
        res.attachment(filename);
        res.send(buf);
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
        const { date, month, year, userId, search } = req.query;
        let attendanceWhere = {};
        let userWhere = { status: 'ACTIVE' };

        if (date) {
            const d = new Date(date);
            attendanceWhere.date = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) };
        } else if (month && year) {
            // Payroll Cycle: 26th of (month-1) to 25th of month
            startDate = new Date(year, month - 2, 26, 0, 0, 0);
            endDate = new Date(year, month - 1, 25, 23, 59, 59);
            attendanceWhere.date = { gte: startDate, lte: endDate };
        } else {
            // Default to current cycle
            attendanceWhere.date = {
                gte: getCycleStartDateIST(),
                lte: getCycleEndDateIST()
            };
        }

        if (userId) {
            attendanceWhere.userId = parseInt(userId);
            userWhere.id = parseInt(userId);
        }

        if (req.user.role === 'AE_MANAGER') {
            attendanceWhere.user = { designation: 'AE' };
            userWhere.designation = 'AE';
        }

        if (search) {
            userWhere.name = { contains: search, mode: 'insensitive' };
        }

        const [records, activeUsers] = await Promise.all([
            prisma.attendance.findMany({
                where: attendanceWhere,
                include: {
                    user: { select: { id: true, name: true, email: true, designation: true } },
                    breaks: true
                },
                orderBy: { date: 'asc' },
            }),
            prisma.user.findMany({
                where: userWhere,
                select: { id: true, name: true, email: true, designation: true }
            })
        ]);

        // Helper to format minutes into readable string
        const formatDuration = (totalMinutes) => {
            if (!totalMinutes || totalMinutes <= 0) return '0m';
            const h = Math.floor(totalMinutes / 60);
            const m = Math.round(totalMinutes % 60);
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        };

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
                    totalGrossMs: 0,
                    totalBreakMinutes: 0,
                    totalMeetingMinutes: 0,
                    status: record.status,
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
                group.totalGrossMs += (checkoutObj - dateObj);

                if (!group.lastLogout || checkoutObj > group.lastLogout) {
                    group.lastLogout = checkoutObj;
                }
            } else {
                group.hasActiveSession = true;
            }

            // Calculate Breaks within this session
            if (record.breaks) {
                record.breaks.forEach(b => {
                    const duration = b.duration || 0;
                    if (['TEA', 'LUNCH'].includes(b.breakType)) {
                        group.totalBreakMinutes += duration;
                    } else if (['CLIENT_MEETING', 'BH_MEETING'].includes(b.breakType)) {
                        group.totalMeetingMinutes += duration;
                    }
                });
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
                        totalGrossMs: 0,
                        totalBreakMinutes: 0,
                        totalMeetingMinutes: 0,
                        status: 'ABSENT',
                        hasActiveSession: false,
                        sessionCount: 0,
                        sessionLogs: [],
                        sessionPhotos: []
                    });
                }
            });
        });

        const flattenedRecords = Array.from(groupedMap.values()).map(group => {
            const grossMinutes = group.totalGrossMs / (1000 * 60);
            const netMinutes = Math.max(0, grossMinutes - group.totalBreakMinutes);

            return {
                Employee: group.Employee,
                Email: group.Email,
                Designation: group.Designation,
                Date: group.Date,
                'Log In': group.firstLogin ? group.firstLogin.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
                'Log Out': group.hasActiveSession ? '-' : (group.lastLogout ? group.lastLogout.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'),
                'Net Working Hours': group.status === 'ABSENT' ? '-' : formatDuration(netMinutes),
                'Total Breaks': group.status === 'ABSENT' ? '-' : formatDuration(group.totalBreakMinutes),
                'Total Meetings': group.status === 'ABSENT' ? '-' : formatDuration(group.totalMeetingMinutes),
                'Sessions': group.sessionCount === 0 ? '-' : group.sessionCount,
                'Session Details': group.sessionLogs.length > 0 ? group.sessionLogs.join(' | ') : '-',
                'Photo Evidence': group.sessionPhotos.length > 0 ? group.sessionPhotos.join(' || ') : '-',
                Status: group.status,
            };
        });

        // Sort by Date Descending
        flattenedRecords.sort((a, b) => new Date(b.Date) - new Date(a.Date));

        // Initialize Workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(flattenedRecords);
        ws['!cols'] = setAutoWidth(flattenedRecords);
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");

        // Write and Send
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const filename = date ? `attendance_report_${date}.xlsx` : 'attendance_report.xlsx';
        res.attachment(filename);
        res.send(buf);
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

        const ws = XLSX.utils.json_to_sheet(flattened);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Requests");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('requests_export.xlsx');
        res.send(buf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export Performance Analytics as CSV
// @route   GET /api/export/analytics
// @access  Private (Admin/HR/BH)
const exportPerformanceAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();

        const defaultStart = getCycleStartDateIST();
        const defaultEnd = getCycleEndDateIST();

        const start = startDate ? getStartOfDayIST(startDate) : defaultStart;
        const end = endDate ? getEndOfDayIST(endDate) : defaultEnd;

        const employees = await prisma.user.findMany({
            where: {
                role: 'EMPLOYEE',
                status: 'ACTIVE',
                id: req.query.userId ? parseInt(req.query.userId) : undefined
            },
            select: { id: true, name: true, email: true, designation: true }
        });

        const stats = await Promise.all(employees.map(async (emp) => {
            const [attendance, workLogs, leaves, permissions] = await Promise.all([
                prisma.attendance.findMany({
                    where: { userId: emp.id, date: { gte: start, lte: end } },
                    include: { breaks: true }
                }),
                prisma.workLog.findMany({
                    where: { userId: emp.id, date: { gte: start, lte: end } }
                }),
                prisma.leaveRequest.findMany({ where: { userId: emp.id, startDate: { gte: start, lte: end } } }),
                prisma.permissionRequest.findMany({ where: { userId: emp.id, date: { gte: start, lte: end } } })
            ]);

            const daysPresent = attendance.length;
            const daysWithLogs = new Set(workLogs.map(log => log.date ? new Date(log.date).toISOString().split('T')[0] : null).filter(Boolean)).size;
            const consistency = daysPresent > 0 ? Math.round((daysWithLogs / daysPresent) * 100) : 0;

            let totalNetMinutes = 0;
            let totalLateness = 0;
            let punctualityCount = 0;

            attendance.forEach(record => {
                if (record.createdAt) {
                    const checkIn = new Date(record.createdAt);
                    const target = new Date(record.createdAt);
                    target.setHours(10, 20, 0, 0); // Unified to 10:20 AM
                    totalLateness += (checkIn - target) / (1000 * 60);
                    punctualityCount++;
                }

                if (record.createdAt && record.checkoutTime) {
                    const gross = (new Date(record.checkoutTime) - new Date(record.createdAt)) / (1000 * 60);
                    const personalBreaks = record.breaks
                        .filter(b => b.breakType === 'TEA' || b.breakType === 'LUNCH')
                        .reduce((acc, b) => acc + (b.endTime ? (new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60) : 0), 0);
                    totalNetMinutes += (gross - personalBreaks);
                }
            });

            const avgLateness = punctualityCount > 0 ? Math.round(totalLateness / punctualityCount) : 0;
            const expectedMinutes = daysPresent * 520; // 8h 40m = 520 mins
            const efficiency = expectedMinutes > 0 ? Math.round((totalNetMinutes / expectedMinutes) * 100) : 0;
            const limitExceeded = leaves.filter(r => r.isExceededLimit).length + permissions.filter(r => r.isExceededLimit).length;

            return {
                Employee: emp.name,
                Email: emp.email,
                Designation: emp.designation,
                'Days Present': daysPresent,
                'Days with Logs': daysWithLogs,
                'Consistency %': `${consistency}%`,
                'Efficiency %': `${efficiency}%`,
                'Avg Punctuality (min)': avgLateness,
                'Limit Exceeded Alerts': limitExceeded
            };
        }));

        const ws = XLSX.utils.json_to_sheet(stats);
        ws['!cols'] = setAutoWidth(stats);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Performance");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const title = req.query.userId ? `performance_detail` : `team_performance`;
        res.attachment(`${title}_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.xlsx`);
        res.send(buf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export Employees as CSV
// @route   GET /api/export/employees
// @access  Private (Admin)
const exportEmployees = async (req, res) => {
    try {
        const { designation, status, search } = req.query;
        let where = {};

        if (designation) where.designation = designation;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const employees = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                designation: true,
                role: true,
                status: true,
                createdAt: true,
                lastWorkLogDate: true
            }
        });

        const flattened = employees.map(emp => ({
            ID: emp.id,
            Name: emp.name,
            Email: emp.email,
            Designation: emp.designation,
            Role: emp.role,
            Status: emp.status,
            'Joined Date': new Date(emp.createdAt).toLocaleDateString(),
            'Last Work Log': emp.lastWorkLogDate ? new Date(emp.lastWorkLogDate).toLocaleDateString() : 'Never'
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(flattened);
        ws['!cols'] = setAutoWidth(flattened);
        XLSX.utils.book_append_sheet(wb, ws, "Employees");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('employees_export.xlsx');
        res.send(buf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export Incentive & Productivity Scorecard
// @route   GET /api/export/incentives
// @access  Private (Admin/HR/BH)
const exportIncentiveScorecard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const defaultStart = getCycleStartDateIST();
        const defaultEnd = getCycleEndDateIST();

        const start = startDate ? getStartOfDayIST(startDate) : defaultStart;
        const end = endDate ? getEndOfDayIST(endDate) : defaultEnd;

        const employees = await prisma.user.findMany({
            where: {
                role: 'EMPLOYEE',
                status: 'ACTIVE',
                id: req.query.userId ? parseInt(req.query.userId) : undefined
            },
            select: { id: true, name: true, email: true, designation: true }
        });

        const scorecards = await Promise.all(employees.map(async (emp) => {
            const [attendance, workLogs] = await Promise.all([
                prisma.attendance.findMany({
                    where: { userId: emp.id, date: { gte: start, lte: end } },
                    include: { breaks: true }
                }),
                prisma.workLog.findMany({
                    where: { userId: emp.id, date: { gte: start, lte: end } }
                })
            ]);

            const daysPresent = attendance.length;
            const daysWithLogs = new Set(workLogs.map(log => log.date ? new Date(log.date).toISOString().split('T')[0] : null).filter(Boolean)).size;

            // Attendance Metrics
            let totalNetMinutes = 0;
            let totalLunchMinutes = 0;
            let lunchCount = 0;

            attendance.forEach(record => {
                if (record.createdAt && record.checkoutTime) {
                    const gross = (new Date(record.checkoutTime) - new Date(record.createdAt)) / (1000 * 60);
                    const personalBreaks = record.breaks
                        .filter(b => b.breakType === 'TEA' || b.breakType === 'LUNCH')
                        .reduce((acc, b) => acc + (b.endTime ? (new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60) : 0), 0);

                    const lunchBreaks = record.breaks
                        .filter(b => b.breakType === 'LUNCH')
                        .reduce((acc, b) => acc + (b.endTime ? (new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60) : 0), 0);

                    if (lunchBreaks > 0) {
                        totalLunchMinutes += lunchBreaks;
                        lunchCount++;
                    }

                    totalNetMinutes += (gross - personalBreaks);
                }
            });

            const avgLunch = lunchCount > 0 ? Math.round(totalLunchMinutes / lunchCount) : 0;
            const netHours = (totalNetMinutes / 60).toFixed(1);

            // Metrics Aggregation
            const metrics = {
                logHours: 0,
                cre_calls: 0,
                cre_visits: 0,
                cre_quotes: 0,
                cre_orders: 0,
                fa_calls: 0,
                fa_siteVisits: 0,
                fa_showroomVisits: 0,
                fa_onlineDiscussions: 0,
                fa_bookings: 0,
                fa_quotes: 0,
                la_images: 0,
                la_freezes: 0,
                la_onlineMeetings: 0,
                la_showroomMeetings: 0,
                la_measurements: 0,
                ae_tasks: 0,
                ae_installs: 0
            };

            workLogs.forEach(log => {
                metrics.logHours += (log.hours || 0);

                // CRE
                metrics.cre_calls += (log.cre_totalCalls || 0);
                metrics.cre_visits += (log.cre_showroomVisits || 0);
                metrics.cre_quotes += (log.cre_fqSent || 0);
                metrics.cre_orders += (log.cre_orders || 0);

                // FA
                metrics.fa_calls += (log.fa_calls || 0);
                metrics.fa_siteVisits += (log.fa_siteVisits || 0);
                metrics.fa_showroomVisits += (log.fa_showroomVisits || 0);
                metrics.fa_onlineDiscussions += (log.fa_onlineDiscussion || 0);
                metrics.fa_bookings += (log.fa_bookingFreezed || 0);
                metrics.fa_quotes += (log.fa_quotePending || 0);

                // LA
                metrics.la_images += (log.completedImages || 0);
                if (log.la_freezingAmount) metrics.la_freezes += 1;
                if (log.la_onlineMeeting) {
                    try {
                        const m = typeof log.la_onlineMeeting === 'string' ? JSON.parse(log.la_onlineMeeting) : log.la_onlineMeeting;
                        if (Array.isArray(m)) metrics.la_onlineMeetings += m.length;
                    } catch (e) { }
                }
                if (log.la_showroomMeeting) {
                    try {
                        const m = typeof log.la_showroomMeeting === 'string' ? JSON.parse(log.la_showroomMeeting) : log.la_showroomMeeting;
                        if (Array.isArray(m)) metrics.la_showroomMeetings += m.length;
                    } catch (e) { }
                }
                if (log.la_measurements) {
                    try {
                        const m = typeof log.la_measurements === 'string' ? JSON.parse(log.la_measurements) : log.la_measurements;
                        if (Array.isArray(m)) metrics.la_measurements += m.length;
                    } catch (e) { }
                }

                // AE
                if (log.ae_tasksCompleted) {
                    try {
                        const tasks = typeof log.ae_tasksCompleted === 'string' ? JSON.parse(log.ae_tasksCompleted) : log.ae_tasksCompleted;
                        if (Array.isArray(tasks)) metrics.ae_tasks += tasks.length;
                        else if (tasks) metrics.ae_tasks += 1;
                    } catch (e) { }
                }
                metrics.ae_installs += (log.ae_itemsInstalled ? (typeof log.ae_itemsInstalled === 'number' ? log.ae_itemsInstalled : 1) : 0);
            });

            const consistency = daysPresent > 0 ? Math.round((daysWithLogs / daysPresent) * 100) : 0;

            // Role-specific display
            let primaryMetric = '-';
            if (emp.designation === 'CRE') primaryMetric = `Calls: ${metrics.cre_calls} | Orders: ${metrics.cre_orders}`;
            else if (emp.designation === 'FA') primaryMetric = `Visits: ${metrics.fa_siteVisits + metrics.fa_showroomVisits} | Bookings: ${metrics.fa_bookings}`;
            else if (emp.designation === 'LA') primaryMetric = `Images: ${metrics.la_images} | Project Freezing: ${metrics.la_freezes}`;
            else if (emp.designation === 'AE') primaryMetric = `Tasks: ${metrics.ae_tasks} | Installs: ${metrics.ae_installs}`;

            return {
                Employee: emp.name,
                Email: emp.email,
                Designation: emp.designation,
                'Days Worked': daysPresent,
                'Logs Submitted': daysWithLogs,
                'Consistency Score %': consistency,
                'Net Work Hours (Attendance)': netHours,
                'Reported Hours (Logs)': metrics.logHours.toFixed(1),
                'Avg Lunch Time (min)': avgLunch || '-',
                'Primary Output': primaryMetric,
                // Breakdown columns for easy filtering
                'CRE: Calls': metrics.cre_calls || '-',
                'CRE: Quotes': metrics.cre_quotes || '-',
                'CRE: Orders': metrics.cre_orders || '-',
                'FA: Calls': metrics.fa_calls || '-',
                'FA: Site Visits': metrics.fa_siteVisits || '-',
                'FA: Bookings': metrics.fa_bookings || '-',
                'FA: Quotes': metrics.fa_quotes || '-',
                'LA: Completed Images': metrics.la_images || '-',
                'LA: Project Freezes': metrics.la_freezes || '-',
                'LA: Meetings': (metrics.la_onlineMeetings + metrics.la_showroomMeetings) || '-',
                'LA: Measurements': metrics.la_measurements || '-',
                'AE: Tasks Completed': metrics.ae_tasks || '-',
                'AE: Items Installed': metrics.ae_installs || '-'
            };
        }));

        const wb = XLSX.utils.book_new();

        // 1. Data Sheet
        const wsData = XLSX.utils.json_to_sheet(scorecards);
        wsData['!cols'] = setAutoWidth(scorecards);
        XLSX.utils.book_append_sheet(wb, wsData, "Incentive_Scorecard");

        // 2. Summary Dashboard Sheet
        const summaryData = [];

        // Departmental Totals
        summaryData.push(["DEPARTMENTAL PRODUCTIVITY TOTALS"]);
        summaryData.push(["Department", "Total Output Metric", "Avg Consistency %", "Avg Net Hours"]);

        const depts = ["CRE", "FA", "LA", "AE"];
        depts.forEach(dept => {
            const deptEmps = scorecards.filter(s => s.Designation === dept);
            if (deptEmps.length > 0) {
                let totalMetric = 0;
                let totalConsistency = 0;
                let totalHours = 0;

                deptEmps.forEach(s => {
                    totalConsistency += s['Consistency Score %'];
                    totalHours += parseFloat(s['Net Work Hours (Attendance)']);

                    // Extract numbers from "Primary Output" string
                    const match = s['Primary Output'].match(/\d+/g);
                    if (match) match.forEach(n => totalMetric += parseInt(n));
                });

                summaryData.push([
                    dept,
                    totalMetric,
                    (totalConsistency / deptEmps.length).toFixed(1) + "%",
                    (totalHours / deptEmps.length).toFixed(1)
                ]);
            }
        });

        summaryData.push([]);
        summaryData.push(["TOP PERFORMERS (By Consistency)"]);
        summaryData.push(["Rank", "Employee", "Designation", "Consistency %"]);

        const topPerformers = [...scorecards]
            .sort((a, b) => b['Consistency Score %'] - a['Consistency Score %'])
            .slice(0, 5);

        topPerformers.forEach((p, i) => {
            summaryData.push([i + 1, p.Employee, p.Designation, p['Consistency Score %'] + "%"]);
        });

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Dashboard_Summary");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`incentive_scorecard_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.xlsx`);
        res.send(buf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    exportWorkLogs,
    exportAttendance,
    exportRequests,
    exportPerformanceAnalytics,
    exportEmployees,
    exportIncentiveScorecard
};
