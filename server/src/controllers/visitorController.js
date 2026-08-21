const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const whatsAppService = require('../utils/WhatsAppService');

/**
 * Get staff list grouped or simple list for CRE, FA, LA, BH dropdowns
 */
const getStaffList = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                designation: true
            },
            orderBy: { name: 'asc' }
        });

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching staff list for visitors record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Create Visitor Record & send WhatsApp alerts to CRE, FA, LA, BH
 */
const createVisitorRecord = async (req, res) => {
    try {
        const {
            clientName,
            phoneNumber,
            reasonOfVisit,
            showroom,
            dateOfVisit,
            timeOfEntry,
            faId,
            laId,
            bhId,
            notes
        } = req.body;

        if (!clientName || !phoneNumber || !reasonOfVisit || !showroom) {
            return res.status(400).json({
                success: false,
                error: 'Client Name, Phone Number, Reason of Visit, and Showroom are required.'
            });
        }

        const creId = req.body.creId ? Number(req.body.creId) : req.user.id;

        // Fetch User models for recipients
        const userIds = [creId, faId, laId, bhId].filter(Boolean).map(id => Number(id));
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, phone: true, role: true, designation: true }
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        const creUser = userMap.get(creId);
        const faUser = faId ? userMap.get(Number(faId)) : null;
        const laUser = laId ? userMap.get(Number(laId)) : null;
        const bhUser = bhId ? userMap.get(Number(bhId)) : null;

        // 1. Create record in Database
        const visitorRecord = await prisma.visitorRecord.create({
            data: {
                clientName,
                phoneNumber,
                reasonOfVisit,
                showroom,
                dateOfVisit: dateOfVisit ? new Date(dateOfVisit) : new Date(),
                timeOfEntry: timeOfEntry || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                creId,
                faId: faId ? Number(faId) : null,
                laId: laId ? Number(laId) : null,
                bhId: bhId ? Number(bhId) : null,
                notes: notes || null
            },
            include: {
                cre: { select: { id: true, name: true, phone: true } },
                fa: { select: { id: true, name: true, phone: true } },
                la: { select: { id: true, name: true, phone: true } },
                bh: { select: { id: true, name: true, phone: true } }
            }
        });

        // 2. Dispatch WhatsApp Notifications to Stakeholders
        const details = {
            clientName,
            phoneNumber,
            reasonOfVisit,
            showroom,
            dateOfVisit: visitorRecord.dateOfVisit,
            timeOfEntry: visitorRecord.timeOfEntry,
            creName: creUser?.name || req.user.name,
            faName: faUser?.name || 'N/A',
            laName: laUser?.name || 'N/A',
            bhName: bhUser?.name || 'N/A'
        };

        const recipients = [
            { role: 'CRE', user: creUser },
            { role: 'FA', user: faUser },
            { role: 'LA', user: laUser },
            { role: 'BH', user: bhUser }
        ].filter(item => item.user && item.user.phone);

        const deliveryLogs = [];
        let anySuccess = false;

        for (const recipient of recipients) {
            console.log(`Sending Visitor Record WhatsApp notification to ${recipient.role} (${recipient.user.name} - ${recipient.user.phone})...`);
            const resData = await whatsAppService.sendVisitorRecordNotification(recipient.user.phone, details);
            deliveryLogs.push({
                role: recipient.role,
                name: recipient.user.name,
                phone: recipient.user.phone,
                success: resData.success,
                error: resData.error || null
            });
            if (resData.success) anySuccess = true;
        }

        // Update WhatsApp sent status on record
        const updatedRecord = await prisma.visitorRecord.update({
            where: { id: visitorRecord.id },
            data: {
                whatsappSent: anySuccess,
                whatsappLog: JSON.stringify(deliveryLogs)
            },
            include: {
                cre: { select: { id: true, name: true, phone: true } },
                fa: { select: { id: true, name: true, phone: true } },
                la: { select: { id: true, name: true, phone: true } },
                bh: { select: { id: true, name: true, phone: true } }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Visitor record created successfully and WhatsApp alerts dispatched!',
            visitorRecord: updatedRecord,
            deliveryLogs
        });
    } catch (error) {
        console.error('Error creating visitor record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get visitor records with filters
 */
const getVisitorRecords = async (req, res) => {
    try {
        const { showroom, startDate, endDate, search } = req.query;

        const whereClause = {};

        if (showroom && showroom !== 'ALL') {
            whereClause.showroom = showroom;
        }

        if (startDate || endDate) {
            whereClause.dateOfVisit = {};
            if (startDate) whereClause.dateOfVisit.gte = new Date(startDate);
            if (endDate) whereClause.dateOfVisit.lte = new Date(`${endDate}T23:59:59.999Z`);
        }

        if (search) {
            whereClause.OR = [
                { clientName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { reasonOfVisit: { contains: search, mode: 'insensitive' } }
            ];
        }

        const records = await prisma.visitorRecord.findMany({
            where: whereClause,
            include: {
                cre: { select: { id: true, name: true, phone: true } },
                fa: { select: { id: true, name: true, phone: true } },
                la: { select: { id: true, name: true, phone: true } },
                bh: { select: { id: true, name: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, count: records.length, records });
    } catch (error) {
        console.error('Error fetching visitor records:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Re-send WhatsApp notification for a specific record
 */
const resendVisitorWhatsApp = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await prisma.visitorRecord.findUnique({
            where: { id: Number(id) },
            include: {
                cre: true,
                fa: true,
                la: true,
                bh: true
            }
        });

        if (!record) {
            return res.status(404).json({ success: false, error: 'Visitor record not found' });
        }

        const details = {
            clientName: record.clientName,
            phoneNumber: record.phoneNumber,
            reasonOfVisit: record.reasonOfVisit,
            showroom: record.showroom,
            dateOfVisit: record.dateOfVisit,
            timeOfEntry: record.timeOfEntry,
            creName: record.cre?.name || 'N/A',
            faName: record.fa?.name || 'N/A',
            laName: record.la?.name || 'N/A',
            bhName: record.bh?.name || 'N/A'
        };

        const recipients = [
            { role: 'CRE', user: record.cre },
            { role: 'FA', user: record.fa },
            { role: 'LA', user: record.la },
            { role: 'BH', user: record.bh }
        ].filter(item => item.user && item.user.phone);

        const deliveryLogs = [];
        let anySuccess = false;

        for (const recipient of recipients) {
            const resData = await whatsAppService.sendVisitorRecordNotification(recipient.user.phone, details);
            deliveryLogs.push({
                role: recipient.role,
                name: recipient.user.name,
                phone: recipient.user.phone,
                success: resData.success,
                error: resData.error || null
            });
            if (resData.success) anySuccess = true;
        }

        const updatedRecord = await prisma.visitorRecord.update({
            where: { id: record.id },
            data: {
                whatsappSent: anySuccess,
                whatsappLog: JSON.stringify(deliveryLogs)
            },
            include: {
                cre: { select: { id: true, name: true, phone: true } },
                fa: { select: { id: true, name: true, phone: true } },
                la: { select: { id: true, name: true, phone: true } },
                bh: { select: { id: true, name: true, phone: true } }
            }
        });

        res.json({
            success: true,
            message: 'WhatsApp notifications resent successfully!',
            visitorRecord: updatedRecord,
            deliveryLogs
        });
    } catch (error) {
        console.error('Error resending WhatsApp notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Delete a visitor record (ADMIN ONLY)
 */
const deleteVisitorRecord = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only Admins can delete visitor records.'
            });
        }

        const existingRecord = await prisma.visitorRecord.findUnique({
            where: { id: Number(id) }
        });

        if (!existingRecord) {
            return res.status(404).json({ success: false, error: 'Visitor record not found.' });
        }

        await prisma.visitorRecord.delete({
            where: { id: Number(id) }
        });

        res.json({
            success: true,
            message: 'Visitor record deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting visitor record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getStaffList,
    createVisitorRecord,
    getVisitorRecords,
    resendVisitorWhatsApp,
    deleteVisitorRecord
};

