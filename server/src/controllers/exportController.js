const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

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
        const { month, year, designation, userId, search, date } = req.query;
        let where = {};
        let userWhere = { status: 'ACTIVE', role: 'EMPLOYEE' };

        let startDate, endDate;

        if (date) {
            const d = new Date(date);
            startDate = new Date(d.setHours(0, 0, 0, 0));
            endDate = new Date(d.setHours(23, 59, 59, 999));
        } else if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
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
                    const userLogs = targetLogs.filter(l => l.userId === user.id && new Date(l.date).toLocaleDateString() === dateStr);

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
                            Project: '-', Client: '-', Site: '-', Hours: '-', StartTime: '-', EndTime: '-', Notes: '-', SubmittedAt: '-'
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
                'Log Status': 'SUBMITTED',
                Project: log.projectName || log.project?.name || '',
                Client: log.clientName || '',
                Site: log.site || '',
                Hours: log.hours || '',
                StartTime: log.startTime || '',
                EndTime: log.endTime || '',
                Notes: log.notes || log.remarks || '',
                SubmittedAt: new Date(log.createdAt).toLocaleString(),
            };

            if (log.customFields) {
                const cf = safeParse(log.customFields);
                Object.entries(cf).forEach(([key, val]) => {
                    common[key.replace(/([A-Z])/g, ' $1').trim()] = formatValue(val);
                });
            }

            let roleEntry = { Employee: common.Employee, Date: common.Date, 'Log Status': common['Log Status'] };

            if (desig === 'CRE') {
                const m = safeParse(log.cre_closing_metrics);
                roleEntry = { ...roleEntry, 'Total Calls': log.cre_totalCalls || '', 'Showroom Visits': log.cre_showroomVisits || m?.showroomVisit || '', 'Floor Plan Rx': m?.floorPlanReceived || '', 'Reviews': m?.reviewCollected || '', 'Quotes Sent': m?.quotesSent || log.cre_fqSent || '', 'Proposals': m?.proposalCount || log.cre_proposals || '', 'Orders': m?.orderCount || log.cre_orders || '', '8 Star Calls': m?.eightStar || '' };
            } else if (desig === 'FA') {
                const m = safeParse(log.fa_closing_metrics);
                roleEntry = { ...roleEntry, 'Call 9 Star': m?.calls?.nineStar || log.fa_calls || '', 'Showroom Visits': m?.showroomVisit || log.fa_showroomVisits || '', 'Site Visits': log.fa_siteVisits || '', 'Online Disc': m?.onlineDiscussion || log.fa_onlineDiscussion || '', 'Quotes Pending': m?.quotationPending || log.fa_quotePending || '', 'Infurnia Count': m?.infurniaPending?.count || '' };
            } else if (desig === 'LA') {
                const m = safeParse(log.la_closing_metrics);
                roleEntry = { ...roleEntry, 'LA Number': log.la_number || '', 'Project Location': log.la_projectLocation || '', 'Project Value': log.la_projectValue || '', 'Site Status': log.la_siteStatus || '', 'Initial 2D': m?.initial2D?.count || '', 'Prod 2D': m?.production2D?.count || '', 'Fresh 3D': m?.fresh3D?.count || '', 'Revised 3D': m?.revised3D?.count || '', 'Estimation': m?.estimation?.count || '' };
            } else if (desig === 'AE') {
                const m = safeParse(log.ae_closing_metrics);
                roleEntry = { ...roleEntry, 'Visit Type': Array.isArray(m?.ae_visitType) ? m.ae_visitType.join(', ') : (m?.ae_visitType || log.ae_visitType || ''), 'Work Stage': m?.ae_workStage || log.ae_workStage || '', 'Measurements': m?.ae_measurements || log.ae_measurements || '', 'Items Installed': m?.ae_itemsInstalled || log.ae_itemsInstalled || '', 'Has Issues': m?.ae_hasIssues ? 'Yes' : (log.ae_hasIssues ? 'Yes' : 'No'), 'Feedback': m?.ae_clientFeedback || log.ae_clientFeedback || '' };
            }

            return { common, role: roleEntry, desig };
        };

        // Determine Dates to show
        let datesToShow = [];
        if (date) {
            datesToShow = [new Date(date).toLocaleDateString()];
        } else {
            // Unique dates from logs or the range
            const logDates = new Set(logs.map(l => new Date(l.date).toLocaleDateString()));
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
            attendanceWhere.date = { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) };
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

        let defaultStart, defaultEnd;
        if (currentDate >= 26) {
            defaultStart = new Date(currentYear, currentMonth, 26);
            defaultEnd = new Date(currentYear, currentMonth + 1, 25, 23, 59, 59);
        } else {
            defaultStart = new Date(currentYear, currentMonth - 1, 26);
            defaultEnd = new Date(currentYear, currentMonth, 25, 23, 59, 59);
        }

        const start = startDate ? new Date(startDate) : defaultStart;
        const end = endDate ? new Date(endDate) : defaultEnd;

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
                    where: { userId: emp.id, createdAt: { gte: start, lte: end } }
                }),
                prisma.leaveRequest.findMany({ where: { userId: emp.id, createdAt: { gte: start, lte: end } } }),
                prisma.permissionRequest.findMany({ where: { userId: emp.id, createdAt: { gte: start, lte: end } } })
            ]);

            const daysPresent = attendance.length;
            const daysWithLogs = new Set(workLogs.map(log => new Date(log.createdAt).toDateString())).size;
            const consistency = daysPresent > 0 ? Math.round((daysWithLogs / daysPresent) * 100) : 0;

            let totalNetMinutes = 0;
            let totalLateness = 0;
            let punctualityCount = 0;

            attendance.forEach(record => {
                if (record.checkIn) {
                    const checkIn = new Date(record.checkIn);
                    const target = new Date(record.checkIn);
                    target.setHours(10, 20, 0, 0); // Unified to 10:20 AM
                    totalLateness += (checkIn - target) / (1000 * 60);
                    punctualityCount++;
                }

                if (record.checkIn && record.checkOut) {
                    const gross = (new Date(record.checkOut) - new Date(record.checkIn)) / (1000 * 60);
                    const personalBreaks = record.breaks
                        .filter(b => b.type === 'TEA' || b.type === 'LUNCH')
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

module.exports = { exportWorkLogs, exportAttendance, exportRequests, exportPerformanceAnalytics };
