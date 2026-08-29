const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');
const fs = require('fs');
const axios = require('axios');

// Helper to determine if user has management permissions for Site Assignments (Only AE Manager)
const isSiteManager = (user) => {
    if (!user) return false;
    const role = (user.role || '').toUpperCase();
    const designation = (user.designation || '').toUpperCase();
    return role === 'AE_MANAGER' || designation === 'AE MANAGER' || designation === 'AE_MANAGER';
};

// @desc    Get dropdown list of active AE employees
// @route   GET /api/site-assignments/ae-list
// @access  Private
const getAEList = async (req, res) => {
    try {
        const aeUsers = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { designation: { equals: 'AE', mode: 'insensitive' } },
                    { designation: { equals: 'AE MANAGER', mode: 'insensitive' } },
                    { designation: { contains: 'AE', mode: 'insensitive' } },
                    { designation: { contains: 'Application Engineer', mode: 'insensitive' } },
                    { role: 'AE_MANAGER' }
                ]
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                designation: true,
                role: true,
                biometricId: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        if (aeUsers.length === 0) {
            const allEmployees = await prisma.user.findMany({
                where: { status: 'ACTIVE', role: { in: ['EMPLOYEE', 'AE_MANAGER', 'WALL2WALL_EMPLOYEE'] } },
                select: { id: true, name: true, email: true, phone: true, designation: true, role: true, biometricId: true },
                orderBy: { name: 'asc' }
            });
            return res.json(allEmployees);
        }

        res.json(aeUsers);
    } catch (error) {
        console.error('Error fetching AE list:', error);
        res.status(500).json({ message: 'Failed to fetch AE list', error: error.message });
    }
};

// @desc    Create a new site assignment
// @route   POST /api/site-assignments
// @access  Private (Only AE Manager)
const createAssignment = async (req, res) => {
    try {
        if (!isSiteManager(req.user)) {
            return res.status(403).json({ message: 'Access denied. Only AE Manager can assign sites.' });
        }

        const {
            siteName,
            clientName,
            location,
            aeId,
            scheduledDate,
            scheduledTime,
            workType,
            remarks
        } = req.body;

        if (!siteName || !aeId || !scheduledDate || !scheduledTime) {
            return res.status(400).json({
                message: 'Site name, AE employee, scheduled date, and scheduled time are required.'
            });
        }

        const parsedAeId = parseInt(aeId, 10);
        if (isNaN(parsedAeId)) {
            return res.status(400).json({ message: 'Invalid AE employee ID.' });
        }

        const aeUser = await prisma.user.findUnique({
            where: { id: parsedAeId }
        });

        if (!aeUser) {
            return res.status(404).json({ message: 'Assigned AE employee not found.' });
        }

        const parsedDate = new Date(scheduledDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid scheduled date format.' });
        }

        const assignment = await prisma.siteAssignment.create({
            data: {
                siteName: siteName.trim(),
                clientName: clientName ? clientName.trim() : null,
                location: location ? location.trim() : null,
                aeId: parsedAeId,
                assignedById: req.user.id,
                scheduledDate: parsedDate,
                scheduledTime: scheduledTime.trim(),
                workType: workType ? workType.trim() : 'Site Inspection',
                remarks: remarks ? remarks.trim() : null
            },
            include: {
                ae: {
                    select: { id: true, name: true, email: true, phone: true, designation: true }
                },
                assignedBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        // Send in-app notification to the assigned AE
        try {
            await prisma.notification.create({
                data: {
                    userId: parsedAeId,
                    title: 'New Site Assigned',
                    message: `You have been assigned to site "${assignment.siteName}" on ${parsedDate.toLocaleDateString('en-GB')} at ${assignment.scheduledTime}.`,
                    type: 'SITE_ASSIGNMENT',
                    relatedId: assignment.id
                }
            });
        } catch (notifErr) {
            console.warn('Notification create warning:', notifErr.message);
        }

        res.status(201).json(assignment);
    } catch (error) {
        console.error('Error creating site assignment:', error);
        res.status(500).json({ message: 'Failed to create site assignment', error: error.message });
    }
};

// @desc    Get site assignments list with search, filter, pagination
// @route   GET /api/site-assignments
// @access  Private
const getAssignments = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const {
            search,
            aeId,
            date,
            startDate,
            endDate,
            workType,
            sortBy = 'scheduledDate',
            sortOrder = 'desc'
        } = req.query;

        const where = {};

        // Role-based visibility: If not AE Manager, only see user's own assigned sites
        if (!isSiteManager(req.user)) {
            where.aeId = req.user.id;
        } else if (aeId && aeId !== 'ALL') {
            const parsedAeId = parseInt(aeId, 10);
            if (!isNaN(parsedAeId)) {
                where.aeId = parsedAeId;
            }
        }

        // Work Type Filter
        if (workType && workType !== 'ALL') {
            where.workType = { equals: workType, mode: 'insensitive' };
        }

        // Date Filters
        if (date) {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
                const startOfDay = new Date(d);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(d);
                endOfDay.setHours(23, 59, 59, 999);
                where.scheduledDate = { gte: startOfDay, lte: endOfDay };
            }
        } else if (startDate || endDate) {
            where.scheduledDate = {};
            if (startDate) {
                const s = new Date(startDate);
                if (!isNaN(s.getTime())) {
                    s.setHours(0, 0, 0, 0);
                    where.scheduledDate.gte = s;
                }
            }
            if (endDate) {
                const e = new Date(endDate);
                if (!isNaN(e.getTime())) {
                    e.setHours(23, 59, 59, 999);
                    where.scheduledDate.lte = e;
                }
            }
        }

        // Search Filter
        if (search && search.trim()) {
            const term = search.trim();
            where.OR = [
                { siteName: { contains: term, mode: 'insensitive' } },
                { clientName: { contains: term, mode: 'insensitive' } },
                { location: { contains: term, mode: 'insensitive' } },
                { remarks: { contains: term, mode: 'insensitive' } },
                { workType: { contains: term, mode: 'insensitive' } },
                { ae: { name: { contains: term, mode: 'insensitive' } } },
                { ae: { email: { contains: term, mode: 'insensitive' } } }
            ];
        }

        const baseWhere = isSiteManager(req.user) ? {} : { aeId: req.user.id };
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const [
            total,
            assignments,
            todayCount,
            uniqueAEs
        ] = await Promise.all([
            prisma.siteAssignment.count({ where }),
            prisma.siteAssignment.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    [sortBy === 'createdAt' ? 'createdAt' : 'scheduledDate']: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc'
                },
                include: {
                    ae: {
                        select: { id: true, name: true, email: true, phone: true, designation: true }
                    },
                    assignedBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            }),
            prisma.siteAssignment.count({
                where: {
                    ...baseWhere,
                    scheduledDate: { gte: todayStart, lte: todayEnd }
                }
            }),
            prisma.siteAssignment.groupBy({
                by: ['aeId'],
                where: baseWhere
            })
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        res.json({
            data: assignments,
            pagination: {
                total,
                page,
                limit,
                totalPages
            },
            summary: {
                total,
                today: todayCount,
                uniqueAECount: uniqueAEs.length
            }
        });
    } catch (error) {
        console.error('Error fetching site assignments:', error);
        res.status(500).json({ message: 'Failed to fetch site assignments', error: error.message });
    }
};

// @desc    Get single site assignment
// @route   GET /api/site-assignments/:id
// @access  Private
const getAssignmentById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

        const assignment = await prisma.siteAssignment.findUnique({
            where: { id },
            include: {
                ae: { select: { id: true, name: true, email: true, phone: true, designation: true } },
                assignedBy: { select: { id: true, name: true, email: true } }
            }
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Site assignment not found' });
        }

        if (!isSiteManager(req.user) && assignment.aeId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied to this assignment.' });
        }

        res.json(assignment);
    } catch (error) {
        console.error('Error fetching site assignment by ID:', error);
        res.status(500).json({ message: 'Failed to fetch assignment', error: error.message });
    }
};

// @desc    Update a site assignment
// @route   PUT /api/site-assignments/:id
// @access  Private (Only AE Manager)
const updateAssignment = async (req, res) => {
    try {
        if (!isSiteManager(req.user)) {
            return res.status(403).json({ message: 'Access denied. Only AE Manager can edit site assignments.' });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

        const existing = await prisma.siteAssignment.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Site assignment not found.' });
        }

        const {
            siteName,
            clientName,
            location,
            aeId,
            scheduledDate,
            scheduledTime,
            workType,
            remarks
        } = req.body;

        const updateData = {};
        if (siteName !== undefined) updateData.siteName = siteName.trim();
        if (clientName !== undefined) updateData.clientName = clientName ? clientName.trim() : null;
        if (location !== undefined) updateData.location = location ? location.trim() : null;
        if (workType !== undefined) updateData.workType = workType ? workType.trim() : 'Site Inspection';
        if (remarks !== undefined) updateData.remarks = remarks ? remarks.trim() : null;
        if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime.trim();

        if (scheduledDate) {
            const parsedDate = new Date(scheduledDate);
            if (!isNaN(parsedDate.getTime())) {
                updateData.scheduledDate = parsedDate;
            }
        }

        if (aeId) {
            const parsedAeId = parseInt(aeId, 10);
            if (!isNaN(parsedAeId)) {
                updateData.aeId = parsedAeId;
            }
        }

        const updated = await prisma.siteAssignment.update({
            where: { id },
            data: updateData,
            include: {
                ae: { select: { id: true, name: true, email: true, phone: true, designation: true } },
                assignedBy: { select: { id: true, name: true, email: true } }
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error updating site assignment:', error);
        res.status(500).json({ message: 'Failed to update site assignment', error: error.message });
    }
};

// @desc    Delete a site assignment
// @route   DELETE /api/site-assignments/:id
// @access  Private (Only AE Manager)
const deleteAssignment = async (req, res) => {
    try {
        if (!isSiteManager(req.user)) {
            return res.status(403).json({ message: 'Access denied. Only AE Manager can delete site assignments.' });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

        const existing = await prisma.siteAssignment.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Site assignment not found.' });
        }

        await prisma.siteAssignment.delete({
            where: { id }
        });

        res.json({ message: 'Site assignment deleted successfully', id });
    } catch (error) {
        console.error('Error deleting site assignment:', error);
        res.status(500).json({ message: 'Failed to delete site assignment', error: error.message });
    }
};

// @desc    Bulk import site assignments from uploaded Excel/CSV file or parsed rows
// @route   POST /api/site-assignments/import
// @access  Private (Only AE Manager)
const bulkImportAssignments = async (req, res) => {
    try {
        if (!isSiteManager(req.user)) {
            return res.status(403).json({ message: 'Access denied. Only AE Manager can import site assignments.' });
        }

        let rawRows = [];

        if (req.file) {
            let workbook;
            if (req.file.buffer) {
                workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            } else if (req.file.path) {
                workbook = XLSX.readFile(req.file.path);
            }

            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                return res.status(400).json({ message: 'Empty or invalid Excel/CSV file.' });
            }

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

            if (req.file.path) {
                try { fs.unlinkSync(req.file.path); } catch (e) { }
            }
        } else if (Array.isArray(req.body.rows)) {
            rawRows = req.body.rows;
        } else {
            return res.status(400).json({ message: 'Please provide an Excel/CSV file or JSON rows array.' });
        }

        if (!rawRows || rawRows.length === 0) {
            return res.status(400).json({ message: 'No data rows found in the imported file.' });
        }

        const allUsers = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, email: true, phone: true, biometricId: true, designation: true }
        });

        const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const imported = [];
        const errors = [];

        for (let i = 0; i < rawRows.length; i++) {
            const raw = rawRows[i];
            const rowNumber = i + 2;

            const normalizedRow = {};
            for (const [k, v] of Object.entries(raw)) {
                normalizedRow[normalizeKey(k)] = v;
            }

            const siteName = String(
                normalizedRow.sitename || normalizedRow.site || normalizedRow.projectname || normalizedRow.project || ''
            ).trim();

            const clientName = String(
                normalizedRow.clientname || normalizedRow.client || normalizedRow.customer || ''
            ).trim();

            const location = String(
                normalizedRow.location || normalizedRow.address || normalizedRow.sitearea || normalizedRow.area || ''
            ).trim();

            const aeIdentifier = String(
                normalizedRow.aeemail || normalizedRow.email || normalizedRow.aename || normalizedRow.ae ||
                normalizedRow.employee || normalizedRow.employeename || normalizedRow.assignedto || normalizedRow.biometricid || ''
            ).trim();

            const rawDate = normalizedRow.scheduleddate || normalizedRow.date || normalizedRow.visitdate || '';
            const scheduledTime = String(
                normalizedRow.scheduledtime || normalizedRow.time || normalizedRow.visittime || normalizedRow.slot || '10:00 AM'
            ).trim();

            const workType = String(
                normalizedRow.worktype || normalizedRow.type || normalizedRow.purpose || normalizedRow.stage || 'Site Inspection'
            ).trim();

            const remarks = String(
                normalizedRow.remarks || normalizedRow.notes || normalizedRow.instructions || ''
            ).trim();

            if (!siteName) {
                errors.push({ row: rowNumber, error: 'Missing Site Name' });
                continue;
            }

            if (!aeIdentifier) {
                errors.push({ row: rowNumber, error: 'Missing AE Employee identifier (Email or Name)' });
                continue;
            }

            const lowerIdentifier = aeIdentifier.toLowerCase();
            const matchedUser = allUsers.find(u =>
                (u.email && u.email.toLowerCase() === lowerIdentifier) ||
                (u.name && u.name.toLowerCase() === lowerIdentifier) ||
                (u.biometricId && String(u.biometricId).toLowerCase() === lowerIdentifier) ||
                (u.name && u.name.toLowerCase().includes(lowerIdentifier))
            );

            if (!matchedUser) {
                errors.push({ row: rowNumber, error: `AE employee "${aeIdentifier}" not found in system` });
                continue;
            }

            let parsedDate = null;
            if (typeof rawDate === 'number') {
                parsedDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            } else if (rawDate) {
                parsedDate = new Date(rawDate);
            } else {
                parsedDate = new Date();
            }

            if (isNaN(parsedDate.getTime())) {
                errors.push({ row: rowNumber, error: `Invalid date format: "${rawDate}"` });
                continue;
            }

            try {
                const record = await prisma.siteAssignment.create({
                    data: {
                        siteName,
                        clientName: clientName || null,
                        location: location || null,
                        aeId: matchedUser.id,
                        assignedById: req.user.id,
                        scheduledDate: parsedDate,
                        scheduledTime: scheduledTime || '10:00 AM',
                        workType: workType || 'Site Inspection',
                        remarks: remarks || null
                    }
                });

                imported.push(record);
            } catch (createErr) {
                errors.push({ row: rowNumber, error: createErr.message });
            }
        }

        res.json({
            success: true,
            totalRows: rawRows.length,
            importedCount: imported.length,
            errorCount: errors.length,
            errors
        });
    } catch (error) {
        console.error('Bulk import site assignments error:', error);
        res.status(500).json({ message: 'Failed to import site assignments', error: error.message });
    }
};

// @desc    Export site assignments to Excel or CSV
// @route   GET /api/site-assignments/export
// @access  Private
const exportAssignments = async (req, res) => {
    try {
        const {
            search,
            aeId,
            startDate,
            endDate,
            format = 'xlsx'
        } = req.query;

        const where = {};

        if (!isSiteManager(req.user)) {
            where.aeId = req.user.id;
        } else if (aeId && aeId !== 'ALL') {
            const parsedAeId = parseInt(aeId, 10);
            if (!isNaN(parsedAeId)) where.aeId = parsedAeId;
        }

        if (startDate || endDate) {
            where.scheduledDate = {};
            if (startDate) {
                const s = new Date(startDate);
                if (!isNaN(s.getTime())) { s.setHours(0, 0, 0, 0); where.scheduledDate.gte = s; }
            }
            if (endDate) {
                const e = new Date(endDate);
                if (!isNaN(e.getTime())) { e.setHours(23, 59, 59, 999); where.scheduledDate.lte = e; }
            }
        }

        if (search && search.trim()) {
            const term = search.trim();
            where.OR = [
                { siteName: { contains: term, mode: 'insensitive' } },
                { clientName: { contains: term, mode: 'insensitive' } },
                { location: { contains: term, mode: 'insensitive' } },
                { workType: { contains: term, mode: 'insensitive' } },
                { ae: { name: { contains: term, mode: 'insensitive' } } }
            ];
        }

        const assignments = await prisma.siteAssignment.findMany({
            where,
            orderBy: { scheduledDate: 'desc' },
            include: {
                ae: { select: { name: true, email: true, phone: true } },
                assignedBy: { select: { name: true, email: true } }
            }
        });

        const rows = assignments.map((item, index) => ({
            'S.No': index + 1,
            'Site Name': item.siteName,
            'Client Name': item.clientName || '-',
            'Location': item.location || '-',
            'Assigned AE': item.ae?.name || 'Unassigned',
            'AE Email': item.ae?.email || '-',
            'AE Phone': item.ae?.phone || '-',
            'Scheduled Date': item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('en-GB') : '-',
            'Scheduled Time': item.scheduledTime || '-',
            'Work Type': item.workType || 'Site Inspection',
            'Assigned By': item.assignedBy?.name || 'AE Manager',
            'Remarks': item.remarks || '',
            'Created At': item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : '-'
        }));

        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Message': 'No site assignments found' }]);

        if (rows.length > 0) {
            const colWidths = Object.keys(rows[0]).map(key => {
                let maxLen = key.length;
                rows.forEach(r => {
                    const l = String(r[key] || '').length;
                    if (l > maxLen) maxLen = l;
                });
                return { wch: Math.min(maxLen + 3, 40) };
            });
            ws['!cols'] = colWidths;
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Site Assignments');

        const timestamp = new Date().toISOString().split('T')[0];
        const isCsv = format.toLowerCase() === 'csv';
        const fileExt = isCsv ? 'csv' : 'xlsx';
        const filename = `site_assignments_${timestamp}.${fileExt}`;

        if (isCsv) {
            const csvOutput = XLSX.utils.sheet_to_csv(ws);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(csvOutput);
        } else {
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(buffer);
        }
    } catch (error) {
        console.error('Error exporting site assignments:', error);
        res.status(500).json({ message: 'Failed to export site assignments', error: error.message });
    }
};

// @desc    Fetch and parse a remote XLS / Google Sheets / Online spreadsheet by URL
// @route   POST /api/site-assignments/fetch-remote-xls
// @access  Private
const fetchRemoteXls = async (req, res) => {
    try {
        let { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'A valid XLS / Google Sheets URL is required.' });
        }

        url = url.trim();

        // If Google Sheets URL, convert to direct XLSX export URL if needed
        if (url.includes('docs.google.com/spreadsheets')) {
            const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (sheetIdMatch && sheetIdMatch[1]) {
                const sheetId = sheetIdMatch[1];
                const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
                const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
                url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidParam}`;
            }
        }

        // Fetch binary spreadsheet buffer from remote link
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const workbook = XLSX.read(response.data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!data || data.length === 0) {
            return res.status(400).json({ message: 'The spreadsheet at this link contains no data rows.' });
        }

        const headers = Object.keys(data[0] || {});

        res.json({
            success: true,
            totalRows: data.length,
            headers,
            data,
            sheetName,
            url
        });
    } catch (error) {
        console.error('Error fetching remote spreadsheet:', error.message);
        res.status(500).json({
            message: `Failed to load spreadsheet from link (${error.message}). Please ensure the link is public or accessible with link sharing enabled.`,
            error: error.message
        });
    }
};

// @desc    Get assigned sites for the logged-in AE employee (for check-in dropdown)
// @route   GET /api/site-assignments/my-sites
// @access  Private
const getMyAssignments = async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = (req.user.email || '').toLowerCase().trim();
        const userName = (req.user.name || '').toLowerCase().trim();

        let myAssignments = [];
        let fallbackSites = [];

        try {
            // 1. Direct assignments to this AE ID or matching email/name
            myAssignments = await prisma.siteAssignment.findMany({
                where: {
                    OR: [
                        { aeId: userId },
                        { ae: { email: { equals: userEmail, mode: 'insensitive' } } },
                        { ae: { name: { equals: userName, mode: 'insensitive' } } }
                    ]
                },
                orderBy: [
                    { scheduledDate: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: 100,
                include: {
                    ae: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            // 2. Also retrieve recent site assignments as fallback if this AE doesn't have personal assignments yet
            if (myAssignments.length === 0) {
                fallbackSites = await prisma.siteAssignment.findMany({
                    orderBy: [
                        { scheduledDate: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    take: 30,
                    include: {
                        ae: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                });
            }
        } catch (dbErr) {
            console.warn('[SiteAssignment] Table SiteAssignment does not exist or query failed:', dbErr.message);
        }

        // 3. Active projects as additional choices
        const activeProjects = await prisma.project.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, client: true, location: true },
            take: 30
        }).catch(() => []);

        res.json({
            assignedSites: myAssignments.length > 0 ? myAssignments : fallbackSites,
            myDirectCount: myAssignments.length,
            activeProjects
        });
    } catch (error) {
        console.error('Error fetching employee assigned sites:', error);
        res.status(500).json({ message: 'Failed to fetch assigned sites', error: error.message });
    }
};

module.exports = {
    getAEList,
    createAssignment,
    getAssignments,
    getAssignmentById,
    updateAssignment,
    deleteAssignment,
    bulkImportAssignments,
    exportAssignments,
    fetchRemoteXls,
    getMyAssignments
};
