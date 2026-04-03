const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const prisma = new PrismaClient();
const { getCycleStartDateIST, getCycleEndDateIST, getStartOfDayIST, getEndOfDayIST, normalizeBiometricDate } = require('../utils/dateHelpers');
const { sendEmail } = require('../utils/emailService');

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
        const { date, month, year, userId, search, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        let attendanceWhere = {};
        let userWhere = { status: 'ACTIVE' };

        let startDate, endDate;

        if (queryStartDate && queryEndDate) {
            startDate = new Date(queryStartDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(queryEndDate);
            endDate.setHours(23, 59, 59, 999);
            attendanceWhere.date = { gte: startDate, lte: endDate };
        } else if (date) {
            const d = new Date(date);
            attendanceWhere.date = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) };
        } else if (month && year) {
            startDate = new Date(year, month - 2, 26, 0, 0, 0);
            endDate = new Date(year, month - 1, 25, 23, 59, 59);
            attendanceWhere.date = { gte: startDate, lte: endDate };
        } else {
            startDate = getCycleStartDateIST();
            endDate = getCycleEndDateIST();
            attendanceWhere.date = { gte: startDate, lte: endDate };
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

        const [records, biometricLogs, activeUsers, permissions, leaves] = await Promise.all([
            prisma.attendance.findMany({
                where: attendanceWhere,
                include: {
                    user: { select: { id: true, name: true, email: true, designation: true } },
                    breaks: true
                },
                orderBy: { date: 'asc' },
            }),
            prisma.biometricLog.findMany({
                where: { punchTime: { gte: new Date(startDate.getFullYear() - 1, 0, 1), lte: new Date(startDate.getFullYear() + 1, 11, 31) } }, // Wide range to catch 1926/2026
            }),
            prisma.user.findMany({
                where: userWhere,
                select: { id: true, name: true, email: true, designation: true }
            }),
            prisma.permissionRequest.findMany({
                where: { date: { gte: startDate, lte: endDate } }
            }),
            prisma.leaveRequest.findMany({
                where: { startDate: { lte: endDate }, endDate: { gte: startDate } }
            })
        ]);

        const formatDuration = (totalMinutes) => {
            if (!totalMinutes || totalMinutes <= 0) return '0m';
            const h = Math.floor(totalMinutes / 60);
            const m = Math.round(totalMinutes % 60);
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        };

        const targetYear = startDate.getFullYear();
        const groupedMap = new Map();
        const host = req.get('host');
        const baseUrl = `${req.protocol}://${host}`;

        // Get all dates in range
        const allDates = [];
        let curr = new Date(startDate);
        while (curr <= endDate) {
            allDates.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        // Initialize with ALL users and ALL dates
        activeUsers.forEach(user => {
            allDates.forEach(d => {
                const dateStr = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
                const key = `${user.id}_${dateStr}`;
                groupedMap.set(key, {
                    Employee: user.name, Email: user.email, Designation: user.designation || 'N/A', Date: dateStr,
                    firstLogin: null, lastLogout: null, bioIn: null, bioOut: null,
                    totalGrossMs: 0, totalBreakMinutes: 0, status: 'ABSENT',
                    sessionCount: 0, sessionLogs: [], approvedPermissionCount: 0, pendingPermissionCount: 0,
                    approvedLeaveCount: 0, pendingLeaveCount: 0,
                    approvedHalfLeaveCount: 0, pendingHalfLeaveCount: 0
                });
            });
        });

        // Process PeopleDesk Records
        records.forEach(record => {
            const dateObj = new Date(record.date);
            const dateStr = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
            const key = `${record.userId}_${dateStr}`;

            if (groupedMap.has(key)) {
                const group = groupedMap.get(key);
                group.status = record.status; // Override ABSENT if record exists
                group.sessionCount++;
                if (!group.firstLogin || dateObj < group.firstLogin) group.firstLogin = dateObj;
                
                if (record.checkoutTime) {
                    const checkoutObj = new Date(record.checkoutTime);
                    group.totalGrossMs += (checkoutObj - dateObj);
                    if (!group.lastLogout || checkoutObj > group.lastLogout) group.lastLogout = checkoutObj;
                }

                if (record.breaks) {
                    record.breaks.forEach(b => {
                        if (['TEA', 'LUNCH'].includes(b.breakType)) group.totalBreakMinutes += (b.duration || 0);
                    });
                }

                if (record.status !== 'ABSENT') {
                    const inTime = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
                    const outTime = record.checkoutTime ? new Date(record.checkoutTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Active';
                    group.sessionLogs.push(`${inTime} - ${outTime}`);
                }
            }
        });

        // Process Biometric Logs (Normalized)
        biometricLogs.forEach(log => {
            const normalizedTime = normalizeBiometricDate(log.punchTime, targetYear);
            if (!normalizedTime) return;
            const dateStr = normalizedTime.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
            const key = `${log.userId}_${dateStr}`;

            if (groupedMap.has(key)) {
                const group = groupedMap.get(key);
                if (!group.bioIn || normalizedTime < group.bioIn) group.bioIn = normalizedTime;
                if (!group.bioOut || normalizedTime > group.bioOut) group.bioOut = normalizedTime;
            }
        });

        permissions.forEach(p => {
            const dateStr = new Date(p.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
            const key = `${p.userId}_${dateStr}`;
            if (groupedMap.has(key)) {
                const group = groupedMap.get(key);
                if (p.status === 'APPROVED') group.approvedPermissionCount++;
                else if (p.status === 'PENDING') group.pendingPermissionCount++;
            }
        });

        // Process Leaves (Map by userId for later)
        const leaveMap = new Map();
        leaves.forEach(l => {
            if (!leaveMap.has(l.userId)) leaveMap.set(l.userId, []);
            leaveMap.get(l.userId).push(l);
        });

        // Fill ABSENT & Logic
        const flattenedRecords = Array.from(groupedMap.values()).map(group => {
            const netMinutes = Math.max(0, (group.totalGrossMs / 60000) - group.totalBreakMinutes);
            
            // Re-find userId for this group
            const user = activeUsers.find(u => u.email === group.Email);
            if (user && leaveMap.has(user.id)) {
                const groupDate = new Date(group.Date.split('/').reverse().join('-'));
                groupDate.setHours(12, 0, 0, 0); // Middle of day for comparison
                
                leaveMap.get(user.id).forEach(l => {
                    const start = new Date(l.startDate);
                    start.setHours(0,0,0,0);
                    const end = new Date(l.endDate);
                    end.setHours(23,59,59,999);
                    
                    if (groupDate >= start && groupDate <= end) {
                        if (l.type === 'HALF_DAY') {
                            if (l.status === 'APPROVED') group.approvedHalfLeaveCount++;
                            else if (l.status === 'PENDING') group.pendingHalfLeaveCount++;
                        } else {
                            if (l.status === 'APPROVED') group.approvedLeaveCount++;
                            else if (l.status === 'PENDING') group.pendingLeaveCount++;
                        }
                    }
                });
            }

            const parseTime = (d) => { if(!d) return null; const ist = new Date(d.getTime() + (5.5*60*60*1000)); return ist.getUTCHours() * 60 + ist.getUTCMinutes(); };
            
            const loginMins = parseTime(group.firstLogin);
            const logoutMins = parseTime(group.lastLogout);
            const bioInMins = parseTime(group.bioIn);
            const bioOutMins = parseTime(group.bioOut);

            const c1 = loginMins !== null && loginMins <= (10 * 60 + 30); // Before 10:30 AM
            const c2 = logoutMins !== null && logoutMins >= (19 * 60);    // After 07:00 PM
            const c3 = bioInMins !== null && bioInMins <= (10 * 60 + 30); // Before 10:30 AM
            const c4 = bioOutMins !== null && bioOutMins >= (19 * 60 + 30); // After 07:30 PM

            const result = c1 && c2 && c3 && c4;

            return {
                Employee: group.Employee,
                Email: group.Email,
                Designation: group.Designation,
                Date: group.Date,
                'Login (PeopleDesk)': group.firstLogin ? group.firstLogin.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
                'Logout (PeopleDesk)': group.lastLogout ? group.lastLogout.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
                'Bio In': group.bioIn ? group.bioIn.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
                'Bio Out': group.bioOut ? group.bioOut.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
                'No. of Permissions': `Approved: ${group.approvedPermissionCount} | Pending: ${group.pendingPermissionCount}`,
                'Total Permissions': group.approvedPermissionCount + group.pendingPermissionCount,
                'No. of Leaves (Full)': `Approved: ${group.approvedLeaveCount} | Pending: ${group.pendingLeaveCount}`,
                'Total Leaves (Full)': group.approvedLeaveCount + group.pendingLeaveCount,
                'No of Leaves (Half)': `Approved: ${group.approvedHalfLeaveCount} | Pending: ${group.pendingHalfLeaveCount}`,
                'Total Leaves (Half)': group.approvedHalfLeaveCount + group.pendingHalfLeaveCount,
                'C1 (Login < 10:30)': c1 ? 'TRUE' : 'FALSE',
                'C2 (Logout > 19:00)': c2 ? 'TRUE' : 'FALSE',
                'C3 (BioIn 10:15-10:30)': c3 ? 'TRUE' : 'FALSE',
                'C4 (BioOut > 19:30)': c4 ? 'TRUE' : 'FALSE',
                'Combined Result (AND)': result ? 'TRUE' : 'FALSE',
                'Net Working Hours': formatDuration(netMinutes),
                Status: group.status,
            };
        });

        flattenedRecords.sort((a, b) => new Date(b.Date.split('/').reverse().join('-')) - new Date(a.Date.split('/').reverse().join('-')));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(flattenedRecords);
        ws['!cols'] = setAutoWidth(flattenedRecords);
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Attendance");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment(`Monthly_Report_${month}_${year}.xlsx`).send(buf);
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

// @desc    Export Call Stats for Admin
// @route   GET /api/export/call-stats
// @access  Private (Admin/HR/BH/Analyzer)
// Helper to generate styled Call Stats Workbook
const generateCallStatsWorkbook = async (startDate, endDate, simFilter) => {
    // 1. Setup Date Range
    const defaultStart = getCycleStartDateIST();
    const defaultEnd = getCycleEndDateIST();
    const start = startDate ? getStartOfDayIST(startDate) : defaultStart;
    const end = endDate ? getEndOfDayIST(endDate) : defaultEnd;

    // 2. Fetch Call Logs
    const callLogs = await prisma.callLog.findMany({
        where: {
            date: { gte: start, lte: end }
        },
        include: {
            user: {
                select: { name: true, id: true, designation: true }
            }
        },
        orderBy: { date: 'desc' }
    });

    // 3. Fetch Excluded Numbers
    const excludedSetting = await prisma.globalSetting.findUnique({
        where: { key: 'EXCLUDED_EMPLOYEE_NUMBERS' }
    });
    const excludedNumbers = excludedSetting ? excludedSetting.value.split(',').map(n => n.trim()) : [];

    // 4. Process Data
    const userGroups = {};
    const detailed = [];

    const fmtSecs = (seconds) => {
        if (!seconds) return '0s';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    callLogs.forEach(log => {
        let filteredCalls = log.calls || [];

        if (startDate && endDate) {
            const sTime = getStartOfDayIST(startDate).getTime();
            const eTime = getEndOfDayIST(endDate).getTime();
            filteredCalls = filteredCalls.filter(c => {
                const cDate = new Date(c.date).getTime();
                return cDate >= sTime && cDate <= eTime;
            });
        }

        if (simFilter && String(simFilter) !== 'ALL' && String(simFilter) !== '0') {
            const slot = String(simFilter).toLowerCase();
            filteredCalls = filteredCalls.filter(c => {
                const cSlot = String(c.simSlot || c.simId || "").toLowerCase();
                return cSlot === slot || cSlot.includes(slot);
            });
        }

        if (filteredCalls.length === 0) return;

        const userName = log.user.name;
        if (!userGroups[userName]) {
            userGroups[userName] = {
                Employee: userName,
                Designation: log.user.designation || 'N/A',
                Total: 0,
                Incoming: 0,
                Outgoing: 0,
                Missed: 0,
                Rejected: 0,
                Duration: 0,
                UniqueContacts: new Set()
            };
        }

        filteredCalls.forEach(c => {
            if (c.number && !excludedNumbers.includes(c.number)) {
                userGroups[userName].Total++;
                if (c.type === 'INCOMING') userGroups[userName].Incoming++;
                if (c.type === 'OUTGOING') userGroups[userName].Outgoing++;
                if (c.type === 'MISSED') userGroups[userName].Missed++;
                if (c.type === 'REJECTED') userGroups[userName].Rejected++;
                userGroups[userName].Duration += (c.duration || 0);
                userGroups[userName].UniqueContacts.add(c.number);
            }

            detailed.push({
                Employee: userName,
                Date: new Date(c.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                Number: c.number,
                Type: c.type,
                Duration: fmtSecs(c.duration || 0),
                'Duration Sec': c.duration || 0,
                'SIM Slot': c.simSlot || c.simId || 'N/A'
            });
        });
    });

    const summary = Object.values(userGroups).map(u => ({
        Employee: u.Employee,
        Designation: u.Designation,
        'Total Calls': u.Total,
        'Total Duration': fmtSecs(u.Duration),
        'Duration Sec': u.Duration,
        'Avg Duration': fmtSecs(u.Total > 0 ? Math.round(u.Duration / u.Total) : 0),
        'Unique Contacts': u.UniqueContacts.size,
        Incoming: u.Incoming,
        Outgoing: u.Outgoing,
        Missed: u.Missed,
        Rejected: u.Rejected
    }));

    // 5. Generate Styled Workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Command Analytics';
    const wsDash = workbook.addWorksheet('Dashboard Overview');
    wsDash.columns = [{ width: 25 }, { width: 35 }, { width: 15 }, { width: 20 }];

    wsDash.mergeCells('A1:D1');
    const titleCell = wsDash.getCell('A1');
    titleCell.value = 'COMMAND ANALYTICS - CALL PERFORMANCE DASHBOARD';
    titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center' };

    wsDash.addRow(['Date Range:', `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`]);
    wsDash.addRow(['Generated At:', new Date().toLocaleString()]);
    wsDash.addRow([]);

    wsDash.addRow(['TOP PERFORMERS (By Total Calls)']).font = { bold: true };
    const perfHeader = wsDash.addRow(['Rank', 'Employee', 'Total Calls', 'Total Duration']);
    const primaryColor = 'FF0F172A'; 
    const secondaryColor = 'FF2563EB'; 
    const headerTextColor = 'FFFFFFFF';

    perfHeader.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
        cell.font = { bold: true, color: { argb: headerTextColor } };
    });

    const topByCalls = [...summary].sort((a, b) => b['Total Calls'] - a['Total Calls']).slice(0, 5);
    topByCalls.forEach((p, i) => wsDash.addRow([i + 1, p.Employee, p['Total Calls'], p['Total Duration']]));

    wsDash.addRow([]);
    wsDash.addRow(['TOP PERFORMERS (By Duration)']).font = { bold: true };
    const durHeader = wsDash.addRow(['Rank', 'Employee', 'Total Duration', 'Unique Contacts']);
    durHeader.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
        cell.font = { bold: true, color: { argb: headerTextColor } };
    });

    const topByDuration = [...summary].sort((a, b) => b['Duration Sec'] - a['Duration Sec']).slice(0, 5);
    topByDuration.forEach((p, i) => wsDash.addRow([i + 1, p.Employee, p['Total Duration'], p['Unique Contacts']]));

    // --- PERFORMANCE SUMMARY ---
    const wsSum = workbook.addWorksheet('Performance Summary');
    wsSum.columns = [
        { header: 'Employee', key: 'Employee', width: 25 },
        { header: 'Designation', key: 'Designation', width: 20 },
        { header: 'Total Calls', key: 'Total Calls', width: 15 },
        { header: 'Total Duration', key: 'Total Duration', width: 20 },
        { header: 'Avg Duration', key: 'Avg Duration', width: 15 },
        { header: 'Unique Contacts', key: 'Unique Contacts', width: 18 },
        { header: 'Incoming', key: 'Incoming', width: 12 },
        { header: 'Outgoing', key: 'Outgoing', width: 12 },
        { header: 'Missed', key: 'Missed', width: 12 },
        { header: 'Rejected', key: 'Rejected', width: 12 }
    ];

    wsSum.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
        cell.font = { bold: true, color: { argb: headerTextColor } };
        cell.alignment = { horizontal: 'center' };
    });

    summary.forEach(data => {
        const row = wsSum.addRow(data);
        if (row.number % 2 === 0) {
            row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; });
        }
    });

    // --- DETAILED LOGS ---
    const wsDet = workbook.addWorksheet('Detailed Logs');
    wsDet.columns = [
        { header: 'Employee', key: 'Employee', width: 25 },
        { header: 'Date', key: 'Date', width: 25 },
        { header: 'Number', key: 'Number', width: 15 },
        { header: 'Type', key: 'Type', width: 12 },
        { header: 'Duration', key: 'Duration', width: 15 },
        { header: 'SIM Slot', key: 'SIM Slot', width: 12 }
    ];

    wsDet.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
        cell.font = { bold: true, color: { argb: headerTextColor } };
    });

    detailed.forEach(data => {
        const row = wsDet.addRow(data);
         if (row.number % 2 === 0) {
            row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; });
        }
    });

    return { workbook, start };
};

// @desc    Export Call Stats for Admin
// @route   GET /api/export/call-stats
// @access  Private (Admin/HR/BH/Analyzer)
const exportCallLogs = async (req, res) => {
    try {
        const { startDate, endDate, simFilter } = req.query;
        const { workbook, start } = await generateCallStatsWorkbook(startDate, endDate, simFilter);
        
        const buffer = await workbook.xlsx.writeBuffer();
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`call_analytics_${start.toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Email Call Stats Report
// @route   POST /api/export/call-stats/email
// @access  Private (Admin/HR/BH/Analyzer)
const emailCallLogs = async (req, res) => {
    try {
        const { startDate, endDate, simFilter, email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const { workbook, start } = await generateCallStatsWorkbook(startDate, endDate, simFilter);
        const buffer = await workbook.xlsx.writeBuffer();

        const success = await sendEmail({
            to: email,
            subject: `Call Analytics Report: ${start.toLocaleDateString()}`,
            text: `Please find attached the Call Analytics Report for ${start.toLocaleDateString()}.`,
            html: `<p>Please find attached the Call Analytics Report for <b>${start.toLocaleDateString()}</b>.</p><p>Generated by Command Analytics System.</p>`,
            attachments: [
                {
                    filename: `call_analytics_${start.toISOString().split('T')[0]}.xlsx`,
                    content: buffer
                }
            ]
        });

        if (success) {
            res.json({ message: 'Report sent successfully to ' + email });
        } else {
            res.status(500).json({ message: 'Failed to send email. Check SMTP configuration.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Helper for Employee Contribution Report
const calculatePunctuality = (checkInTime) => {
    if (!checkInTime) return 0;
    const utcDate = new Date(checkInTime);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const checkInIST = new Date(utcDate.getTime() + istOffset);
    const target = new Date(checkInIST);
    target.setHours(10, 20, 0, 0);
    return (checkInIST - target) / (1000 * 60);
};

// @desc    Export Employee Detailed Monthly Contribution Report
// @route   GET /api/export/employee-contribution
// @access  Private (Admin/HR/BH)
const exportEmployeeContributionReport = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Security check: Employees can only export their own reports
        if (req.user.role === 'EMPLOYEE' && req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: 'Forbidden: You can only export your own report' });
        }

        const start = startDate ? getStartOfDayIST(startDate) : getCycleStartDateIST();
        const end = endDate ? getEndOfDayIST(endDate) : getCycleEndDateIST();

        const employee = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: { id: true, name: true, email: true, designation: true }
        });

        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const [attendance, workLogs] = await Promise.all([
            prisma.attendance.findMany({
                where: { userId: employee.id, date: { gte: start, lte: end } },
                include: { breaks: true },
                orderBy: { date: 'asc' }
            }),
            prisma.workLog.findMany({
                where: { userId: employee.id, date: { gte: start, lte: end } },
                orderBy: { date: 'asc' }
            })
        ]);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Contribution Report');

        // Styles
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }, 
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        };

        const summaryLabelStyle = {
            font: { bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
            alignment: { horizontal: 'left' }
        };

        // Header Section
        sheet.mergeCells('A1:H1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = `EMPLOYEE CONTRIBUTION REPORT: ${employee.name.toUpperCase()}`;
        titleCell.font = { size: 14, bold: true, color: { argb: 'FF0F172A' } };
        titleCell.alignment = { horizontal: 'center' };

        sheet.addRow([`Designation: ${employee.designation}`, '', `Period: ${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}`]);
        sheet.addRow([]);

        // Table Headers
        const headers = ['Date', 'In Time', 'Out Time', 'Gross Hours', 'Break (Mins)', 'Net Hours', 'Punctuality', 'Log Status'];
        const headerRow = sheet.addRow(headers);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
            cell.style = headerStyle;
        });

        // Data Rows
        let totalNetMinutes = 0;
        let totalLateness = 0;
        let punctualityDays = 0;
        const attendedDates = new Set();

        attendance.forEach(record => {
            const dateStr = new Date(record.date).toLocaleDateString('en-IN');
            attendedDates.add(new Date(record.date).toDateString());

            const inTimeStr = record.date ? new Date(record.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
            const outTimeStr = record.checkoutTime ? new Date(record.checkoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
            
            let grossMins = 0;
            if (record.date && record.checkoutTime) {
                grossMins = (new Date(record.checkoutTime) - new Date(record.date)) / (1000 * 60);
            }

            const breakMins = record.breaks
                ? record.breaks
                    .filter(b => b.breakType === 'TEA' || b.breakType === 'LUNCH')
                    .reduce((acc, b) => acc + (b.duration || 0), 0)
                : 0;

            const netMins = Math.max(0, grossMins - breakMins);
            totalNetMinutes += netMins;

            const lateness = calculatePunctuality(record.date);
            totalLateness += lateness;
            punctualityDays++;

            const hasLog = workLogs.some(l => new Date(l.date).toDateString() === new Date(record.date).toDateString());

            const row = sheet.addRow([
                dateStr,
                inTimeStr,
                outTimeStr,
                (grossMins/60).toFixed(2),
                breakMins,
                (netMins/60).toFixed(2),
                lateness > 0 ? `${Math.round(lateness)}m Late` : `${Math.round(Math.abs(lateness))}m Early`,
                hasLog ? 'SUBMITTED' : 'NOT SUBMITTED'
            ]);

            // Styling for rows
            row.alignment = { horizontal: 'center' };
            const logCell = row.getCell(8);
            if (!hasLog) {
                logCell.font = { color: { argb: 'FFEF4444' }, bold: true }; // Red-500
            } else {
                logCell.font = { color: { argb: 'FF10B981' }, bold: true }; // Emerald-500
            }

            const puncCell = row.getCell(7);
            if (lateness > 10) {
                puncCell.font = { color: { argb: 'FFF59E0B' } }; // Amber-500
            }
        });

        // Summary Calculations
        const daysWithLogs = new Set(workLogs.map(l => new Date(l.date).toDateString())).size;
        const avgLateness = punctualityDays > 0 ? Math.round(totalLateness / punctualityDays) : 0;

        sheet.addRow([]);
        const sumHeader = sheet.addRow(['MONTHLY PERFORMANCE SUMMARY']);
        sumHeader.getCell(1).font = { bold: true, size: 12 };
        
        sheet.addRow(['Total Days Present', '', attendedDates.size]);
        sheet.addRow(['Logs Submitted', '', daysWithLogs]);
        sheet.addRow(['Consistency %', '', attendedDates.size > 0 ? `${Math.round((daysWithLogs / attendedDates.size) * 100)}%` : '0%']);
        sheet.addRow(['Total Contribution', '', `${(totalNetMinutes / 60).toFixed(1)} Hours`]);
        sheet.addRow(['Average Punctuality', '', avgLateness > 0 ? `${avgLateness}m Late (Avg)` : `${Math.abs(avgLateness)}m Early (Avg)`]);

        // Auto-width
        sheet.columns.forEach(col => {
            col.width = 18;
        });

        // --- SECOND SHEET: WORKLOG DETAILS ---
        const logSheet = workbook.addWorksheet('Worklog Details');
        const desig = employee.designation || 'OTHER';
        
        // Base columns
        const logCols = [
            { header: 'Date', key: 'Date', width: 15 },
            { header: 'Hours', key: 'Hours', width: 10 }
        ];

        // Add dynamic columns based on designation
        if (desig === 'CRE') {
            logCols.push(
                { header: 'Total Calls', key: 'totalCalls', width: 12 },
                { header: 'WhatsApp', key: 'whatsapp', width: 12 },
                { header: 'Showroom Vis', key: 'showroom', width: 12 },
                { header: 'Orders', key: 'orders', width: 10 },
                { header: 'Proposals', key: 'proposals', width: 10 }
            );
        } else if (desig === 'FA') {
            logCols.push(
                { header: 'Site Visits', key: 'siteVisits', width: 12 },
                { header: 'Initial Quote', key: 'initQuote', width: 12 },
                { header: 'Revised Quote', key: 'revisedQuote', width: 12 },
                { header: 'Showroom Time', key: 'showroomTime', width: 15 }
            );
        } else if (desig === 'LA' || desig === 'AE') {
            logCols.push(
                { header: 'Projects & Tasks', key: 'projects', width: 60 },
                { header: 'Site/Project Status', key: 'status', width: 25 }
            );
        }

        logCols.push({ header: 'Daily Remarks', key: 'Remarks', width: 50 });
        logSheet.columns = logCols;

        logSheet.getRow(1).eachCell(cell => {
            cell.style = headerStyle;
        });

        workLogs.forEach(log => {
            const rowData = {
                Date: new Date(log.date).toLocaleDateString('en-IN'),
                Hours: log.hours || '-',
                Remarks: log.remarks || log.notes || '-'
            };

            if (desig === 'CRE') {
                const cl = safeParse(log.cre_closing_metrics);
                rowData.totalCalls = cl?.uptoTodayCalls || log.cre_totalCalls || '-';
                rowData.whatsapp = cl?.whatsappSent || '-';
                rowData.showroom = cl?.showroomVisit || log.cre_showroomVisits || '-';
                rowData.orders = cl?.orderCount || log.cre_orders || '-';
                rowData.proposals = cl?.proposalCount || log.cre_proposals || '-';
            } else if (desig === 'FA') {
                const cl = safeParse(log.fa_closing_metrics);
                rowData.siteVisits = log.fa_siteVisits || '-';
                rowData.initQuote = cl?.initialQuote?.count || log.fa_initialQuoteRn || '-';
                rowData.revisedQuote = cl?.revisedQuote?.count || log.fa_revisedQuoteRn || '-';
                rowData.showroomTime = log.fa_showroomTime || '-';
            } else if (desig === 'LA' || desig === 'AE') {
                const reportsField = desig === 'AE' ? 'ae_project_reports' : 'la_project_reports';
                const reports = safeParse(log[reportsField]);
                if (Array.isArray(reports)) {
                    rowData.projects = reports.map(r => {
                        const item = typeof r === 'string' ? safeParse(r) : r;
                        const tasks = Array.isArray(item.ae_tasksCompleted) ? item.ae_tasksCompleted.join(', ') : (item.ae_tasksCompleted || item.tasks || item.process || '');
                        return `${item.clientName || 'Site'}: ${tasks}`;
                    }).join(' | ');
                    
                    rowData.status = reports.map(r => {
                        const item = typeof r === 'string' ? safeParse(r) : r;
                        return `${item.clientName || 'Site'}: ${item.ae_siteStatus || item.status || '-'}`;
                    }).join(' | ');
                } else {
                    rowData.projects = log.tasks || log.projectName || '-';
                    rowData.status = log.ae_siteStatus || log.la_siteStatus || '-';
                }
            }

            logSheet.addRow(rowData);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`Monthly_Report_${employee.name.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Internal helper for Task Summary reports
const getTaskMetrics = (employee, workLogs) => {
    const desig = employee.designation ? employee.designation.toUpperCase() : 'OTHER';
    let taskSummary = {};
    let metricsKey = '';
    let taskFields = [];

    // 1. Define structured task fields for specialized roles
    if (desig.includes('LA') || desig.includes('LOADING')) {
        metricsKey = 'la_closing_metrics';
        taskFields = [
            { k: 'initial2D', l: 'Initial 2D' }, { k: 'production2D', l: 'Prod 2D' },
            { k: 'revised2D', l: 'Revised 2D' }, { k: 'fresh3D', l: 'Fresh 3D' },
            { k: 'revised3D', l: 'Revised 3D' }, { k: 'estimation', l: 'Estimation' },
            { k: 'woe', l: 'WOE' }, { k: 'onlineDiscussion', l: 'Online Disc' },
            { k: 'showroomDiscussion', l: 'Showroom Disc' }, { k: 'signFromEngineer', l: 'Sign Engr' },
            { k: 'siteVisit', l: 'Site Visit' }, { k: 'infurnia', l: 'Infurnia' }
        ];
    } else if (desig.includes('CRE') || desig.includes('RELATIONSHIP')) {
        metricsKey = 'cre_closing_metrics';
        taskFields = [
            { k: 'eightStar', l: '8 Star Calls' }, { k: 'sevenStar', l: '7 Star Calls' }, 
            { k: 'sixStar', l: '6 Star Calls' }, { k: 'fiveStar', l: '5 Star Calls' }, 
            { k: 'fourStar', l: '4 Star Calls' }, { k: 'threeStar', l: '3 Star Calls' }, 
            { k: 'twoStar', l: '2 Star Calls' }, { k: 'showroomVisit', l: 'Showroom Visit' }, 
            { k: 'onlineDiscussion', l: 'Online Disc' }, { k: 'whatsappSent', l: 'WhatsApp Sent' }, 
            { k: 'reviewCollected', l: 'Reviews collected' }, { k: 'firstQuotationSent', l: 'FQ Sent' }, 
            { k: 'orderCount', l: 'Orders' }, { k: 'proposalCount', l: 'Proposals' },
            { k: 'quotesSent', l: 'Quotes Sent' }
        ];
    } else if (desig.includes('FA') || desig.includes('FEASIBILITY')) {
        metricsKey = 'fa_closing_metrics';
        taskFields = [
            { k: 'nineStar', l: '9 Star Calls' }, { k: 'eightStar', l: '8 Star Calls' },
            { k: 'sevenStar', l: '7 Star Calls' }, { k: 'showroomVisit', l: 'Showroom Visit' },
            { k: 'onlineDiscussion', l: 'Online Disc' }, { k: 'quotationPending', l: 'Quotation Done' }
        ];
    } else if (desig.includes('AE') || desig.includes('APPLICATION')) {
        // Application Engineer (Structured metrics from project reports)
        taskFields = [
            { k: 'siteVisits', l: 'Total Site Visits' },
            { k: 'measurements', l: 'Measurements Taken' },
            { k: 'installations', l: 'Installations' },
            { k: 'issuesIdentified', l: 'Issues Identified' },
            { k: 'clientFeedbackGood', l: 'Client Fed. (Good)' },
            { k: 'totalPhotos', l: 'Photos Uploaded' }
        ];
    }

    // Always include basic metrics
    taskSummary['totalLogs'] = { label: 'Total Work Reports Submitted', count: 0 };
    taskSummary['totalHours'] = { label: 'Total Hours Worked', count: 0 };
    
    // Initialize standard fields
    taskFields.forEach(f => {
        taskSummary[f.k] = { label: f.l, count: 0 };
    });

    // Special grouping for generic/other roles
    const isOther = taskFields.length === 0;

    // Sum counts from logs
    workLogs.forEach(log => {
        taskSummary['totalLogs'].count++;
        taskSummary['totalHours'].count += Number(log.hours || log.attendanceHours || 0);

        // A. Specialized Metrics (LA, CRE, FA)
        if (metricsKey) {
            const metrics = safeParse(log[metricsKey]);
            if (metrics) {
                taskFields.forEach(f => {
                    const data = metrics[f.k];
                    if (data !== undefined && data !== null) {
                        if (typeof data === 'object') {
                            const count = data.count !== undefined ? data.count : (data.value !== undefined ? data.value : 0);
                            taskSummary[f.k].count += Number(count || 0);
                        } else {
                            taskSummary[f.k].count += Number(data || 0);
                        }
                    }
                });
            }
        } 
        // B. AE Metrics (Special logic for array of site reports)
        else if (desig.includes('AE') || desig.includes('APPLICATION')) {
            const reports = safeParse(log.ae_project_reports) || [];
            if (Array.isArray(reports)) {
                taskSummary['siteVisits'].count += reports.length;
                reports.forEach(r => {
                    const report = typeof r === 'string' ? safeParse(r) : r;
                    if (report.ae_measurements) taskSummary['measurements'].count++;
                    if (report.ae_itemsInstalled) taskSummary['installations'].count += Number(report.ae_itemsInstalled || 0);
                    if (report.ae_hasIssues) taskSummary['issuesIdentified'].count++;
                    if (report.ae_clientFeedback === '😊') taskSummary['clientFeedbackGood'].count++;
                    if (Array.isArray(report.ae_photos)) taskSummary['totalPhotos'].count += report.ae_photos.length;
                });
            }
        }
        // C. Generic (OFFICE-ADMIN, ACCOUNT, DM etc.)
        else if (isOther) {
            let tasksFoundCount = 0;
            const custom = safeParse(log.customFields);

            // 1. Check for arrays of tasks (handles 'tasks', 'Task Entries', etc.)
            const taskList = custom ? (custom.tasks || custom['Task Entries'] || custom.taskEntries) : null;
            
            if (Array.isArray(taskList) && taskList.length > 0) {
                taskList.forEach(t => {
                    // Try all common task field names
                    const desc = (t.task || t.description || t.taskDescription || t.workDescription || '').trim();
                    if (desc) {
                        const key = `gen_${desc.toLowerCase().replace(/\s+/g, '_')}`;
                        if (!taskSummary[key]) taskSummary[key] = { label: desc, count: 0 };
                        taskSummary[key].count++;
                        tasksFoundCount++;
                    }
                });
            } 
            
            // 2. Check direct customFields (Object style / Single fields)
            if (custom && typeof custom === 'object') {
                Object.entries(custom).forEach(([k, v]) => {
                    // Skip if it's the array we already processed or an administrative field
                    if (['tasks', 'Task Entries', 'taskEntries', '_id'].includes(k)) return;
                    
                    if (typeof v === 'string' && v.trim().length > 0 && !k.toLowerCase().includes('link')) {
                        const key = `gen_${k.toLowerCase().replace(/\s+/g, '_')}`;
                        if (!taskSummary[key]) taskSummary[key] = { label: k, count: 0 };
                        const val = Number(v);
                        taskSummary[key].count += isNaN(val) ? 1 : val;
                        tasksFoundCount++;
                    }
                });
            }


            // Fallback to model-level process/tasks if no specific tasks found in customFields
            if (tasksFoundCount === 0) {
                const desc = (log.tasks || log.process || log.remarks || '').trim();
                // Capture all descriptive work
                if (desc && desc.length > 0 && desc.length < 200) {
                     const key = `gen_${desc.toLowerCase().replace(/\s+/g, '_')}`;
                     if (!taskSummary[key]) taskSummary[key] = { label: desc, count: 0 };
                     taskSummary[key].count++;
                }
            }
        }


    });

    return { taskSummary, desig, taskFields };
};


// @desc    Export Employee Task Summary (Monthly)
// @route   GET /api/export/task-summary
// @access  Private (Admin/HR/BH)
const exportEmployeeTaskSummary = async (req, res) => {
    try {
        const { userId, month, year } = req.query;
        if (!userId || !month || !year) {
            return res.status(400).json({ message: 'User ID, Month, and Year are required' });
        }

        // Security check: Employees can only export their own reports
        if (req.user.role === 'EMPLOYEE' && req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: 'Forbidden: You can only export your own report' });
        }

        const employee = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: { id: true, name: true, designation: true }
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Standard Cycle Date Logic
        const startDate = getCycleStartDateIST(null, year, parseInt(month) - 2); // 26th of month-1
        const endDate = getCycleEndDateIST(null, year, parseInt(month) - 1);  // 25th of month

        const workLogs = await prisma.workLog.findMany({
            where: {
                userId: parseInt(userId),
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: 'asc' }
        });

        const { taskSummary, desig } = getTaskMetrics(employee, workLogs);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Monthly Task Summary');

        sheet.addRow([`Employee Monthly Task Summary: ${employee.name}`]).font = { bold: true, size: 14 };
        sheet.addRow([`Designation: ${desig}`]);
        sheet.addRow([`Period: ${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}`]);
        sheet.addRow([]);

        const headerRow = sheet.addRow(['S.No', 'Task Description', 'Total Monthly Count']);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center' };
        });

        let rowIndex = 1;
        Object.values(taskSummary).forEach(task => {
            // Always show basic metrics (Total Logs, Hours) and show other tasks only if count > 0 (unless LA which shows all fields)
            const isBasic = task.label === 'Total Hours Worked' || task.label === 'Total Work Reports Submitted';
            if (task.count > 0 || isBasic || desig.includes('LA')) { 
                sheet.addRow([rowIndex++, task.label, task.count]);
            }
        });

        sheet.columns = [{ width: 8 }, { width: 40 }, { width: 25 }];
        sheet.getColumn(3).alignment = { horizontal: 'center' };

        const buffer = await workbook.xlsx.writeBuffer();
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`Task_Summary_${employee.name.replace(/\s+/g, '_')}_${month}_${year}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export All Employees Task Summary (Monthly Consolidated)
// @route   GET /api/export/all-task-summary
// @access  Private (Admin/HR/BH)
const exportAllEmployeesTaskSummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and Year are required' });
        }

        const startDate = getCycleStartDateIST(null, parseInt(year), parseInt(month) - 2);
        const endDate = getCycleEndDateIST(null, parseInt(year), parseInt(month) - 1);

        // Fetch all active employees (excluding ADMIN and system roles)
        const employees = await prisma.user.findMany({
            where: {
                role: 'EMPLOYEE',
                status: 'ACTIVE'
            },
            select: { id: true, name: true, designation: true }
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Monthly Task Summary');

        sheet.addRow([`Consolidated Monthly Task Summary`]).font = { bold: true, size: 14 };
        sheet.addRow([`Month: ${month}/${year}`]);
        sheet.addRow([`Period: ${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}`]);
        sheet.addRow([]);

        const headerRow = sheet.addRow(['S.No', 'Employee Name', 'Designation', 'Task Description', 'Monthly Total']);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center' };
        });

        let rowIndex = 1;
        for (const employee of employees) {
            const workLogs = await prisma.workLog.findMany({
                where: {
                    userId: employee.id,
                    date: { gte: startDate, lte: endDate }
                }
            });

            const { taskSummary, desig } = getTaskMetrics(employee, workLogs);

            Object.values(taskSummary).forEach(task => {
                const isBasic = task.label === 'Total Hours Worked' || task.label === 'Total Work Reports Submitted';
                if (task.count > 0 || isBasic) {
                    sheet.addRow([rowIndex++, employee.name, desig, task.label, task.count]);
                }
            });
        }

        sheet.columns = [
            { width: 8 }, 
            { width: 30 }, 
            { width: 15 }, 
            { width: 40 }, 
            { width: 25 }
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`Global_Task_Summary_${month}_${year}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export Project Wise Reports (Monthly) - Supports LA & FA
// @route   GET /api/export/project-wise
// @access  Private (Admin/HR/BH)
const exportProjectWiseReports = async (req, res) => {
    try {
        const { userId, month, year } = req.query;
        if (!userId || !month || !year) {
            return res.status(400).json({ message: 'User ID, Month, and Year are required' });
        }

        // Security check: Employees can only export their own reports
        if (req.user.role === 'EMPLOYEE' && req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: 'Forbidden: You can only export your own report' });
        }

        const employee = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: { id: true, name: true, designation: true }
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const startDate = getCycleStartDateIST(null, year, parseInt(month) - 2);
        const endDate = getCycleEndDateIST(null, year, parseInt(month) - 1);

        const workLogs = await prisma.workLog.findMany({
            where: {
                userId: parseInt(userId),
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: 'asc' }
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Project Wise Detailed Reports');

        sheet.addRow([`Project Wise Detailed Report: ${employee.name}`]).font = { bold: true, size: 14 };
        sheet.addRow([`Designation: ${employee.designation}`]);
        
        // Fix for IST timezone display in Excel header (26th to 25th)
        const displayStart = new Date(startDate.getTime() + (5.5 * 60 * 60 * 1000));
        const displayEnd = new Date(endDate.getTime() + (5.5 * 60 * 60 * 1000));
        const periodStr = `${displayStart.getUTCDate()}/${displayStart.getUTCMonth() + 1}/${displayStart.getUTCFullYear()} to ${displayEnd.getUTCDate()}/${displayEnd.getUTCMonth() + 1}/${displayEnd.getUTCFullYear()}`;
        sheet.addRow([`Period: ${periodStr}`]);
        sheet.addRow([]);

        const headers = [
            'Sl.No', 'Date', 'Project/Client', 'Site Location', 
            'Process/Task', 'Target Images', 'Completed', 'Pending', 
            'Start Time', 'End Time', 'Remarks'
        ];
        const headerRow = sheet.addRow(headers);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center' };
        });

        let rowIndex = 1;
        workLogs.forEach(log => {
            const laProjects = safeParse(log.la_project_reports) || [];
            const faProjects = safeParse(log.fa_project_reports) || [];
            const projects = Array.isArray(laProjects) ? [...laProjects] : [];
            if (Array.isArray(faProjects)) projects.push(...faProjects);

            if (projects.length > 0) {
                projects.forEach(p => {
                    sheet.addRow([
                        rowIndex++,
                        log.date.toLocaleDateString('en-IN'),
                        p.clientName || p.projectName || '-',
                        p.site || p.la_projectLocation || '-',
                        p.process || '-',
                        p.imageCount || 0,
                        p.completedImages || 0,
                        p.pendingImages || 0,
                        p.startTime || '-',
                        p.endTime || '-',
                        p.remarks || '-'
                    ]);
                });
            }
        });

        sheet.columns = [
            { width: 8 }, { width: 15 }, { width: 30 }, { width: 25 },
            { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 },
            { width: 12 }, { width: 12 }, { width: 40 }
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`Project_Reports_${employee.name.replace(/\s+/g, '_')}_${month}_${year}.xlsx`);
        res.send(buffer);

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
    exportIncentiveScorecard,
    exportCallLogs,
    emailCallLogs,
    exportEmployeeContributionReport,
    exportEmployeeTaskSummary,
    exportAllEmployeesTaskSummary,
    exportProjectWiseReports
};
