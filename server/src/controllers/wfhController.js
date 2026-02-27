const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Create new WFH request
// @route   POST /api/wfh
// @access  Private
const createWfhRequest = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user has WFH enabled and get details
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                wfhViewEnabled: true,
                name: true,
                designation: true
            }
        });

        if (!user || !user.wfhViewEnabled) {
            return res.status(403).json({ message: 'WFH requests are currently disabled for your account. Contact Admin.' });
        }

        const requestData = {
            userId,
            employeeName: user.name || "",
            employeeId: user.employeeId || "",
            department: user.department || "",
            designation: user.designation || "",
            reportingManager: req.body.reportingManager || "",
            wfhDays: parseInt(req.body.wfhDays) || 0,
            startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
            endDate: req.body.endDate ? new Date(req.body.endDate) : new Date(),

            realReason: req.body.realReason || "",
            necessityReason: req.body.necessityReason || "",
            impactIfRejected: req.body.impactIfRejected || "",
            proofDetails: req.body.proofDetails || "",

            primaryProject: req.body.primaryProject || "",
            criticalReason: req.body.criticalReason || "",
            deliverables: req.body.deliverables || "",
            measurableOutput: req.body.measurableOutput || "",
            deadline: req.body.deadline || "",

            workingHours: req.body.workingHours || "",
            trackingMethod: req.body.trackingMethod || "",
            communicationPlan: req.body.communicationPlan || "",
            responseTime: parseInt(req.body.responseTime) || 0,

            environmentSetup: req.body.environmentSetup || "",
            hasDedicatedWorkspace: !!req.body.hasDedicatedWorkspace,
            hasStableInternet: !!req.body.hasStableInternet,
            noInterruptions: !!req.body.noInterruptions,
            hasPowerBackup: !!req.body.hasPowerBackup,
            hasSecurityCompliance: !!req.body.hasSecurityCompliance,
            hasErgonomicSeating: !!req.body.hasErgonomicSeating,

            risksManagement: req.body.risksManagement || "",
            failurePlan: req.body.failurePlan || "",
            officeVisitCommitment: !!req.body.officeVisitCommitment,

            currentLevel: 1,
            status: 'PENDING',
            hrStatus: 'PENDING',
            bhStatus: 'PENDING',
            adminStatus: 'PENDING'
        };

        const wfhRequest = await prisma.wfhRequest.create({
            data: requestData
        });

        res.status(201).json(wfhRequest);
    } catch (error) {
        console.error('SERVER ERROR IN createWfhRequest:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all WFH requests (Admin/HR/BH view based on level)
// @route   GET /api/wfh/manage
// @access  Private (Admin, HR, BH)
const getManageableWfhRequests = async (req, res) => {
    try {
        const { role, id: managerId } = req.user;
        let where = {};

        if (role === 'HR') {
            where = { currentLevel: 1, status: 'PENDING' };
        } else if (role === 'BUSINESS_HEAD') {
            // BH only sees requests approved by HR
            where = { currentLevel: 2, status: 'PENDING' };
        } else if (role === 'ADMIN') {
            // Admin only sees requests approved by BH
            where = { currentLevel: 3, status: 'PENDING' };
        } else {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const requests = await prisma.wfhRequest.findMany({
            where,
            include: {
                user: {
                    select: { name: true, designation: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get my WFH requests
// @route   GET /api/wfh/me
// @access  Private
const getMyWfhRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const requests = await prisma.wfhRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Process WFH approval
// @route   PUT /api/wfh/:id/approve
// @access  Private (Admin, HR, BH)
const approveWfhRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body; // 'APPROVED' or 'REJECTED'
        const { role } = req.user;

        const request = await prisma.wfhRequest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        let updateData = { remarks: remarks || request.remarks };

        if (status === 'REJECTED') {
            updateData.status = 'REJECTED';
            if (role === 'HR') updateData.hrStatus = 'REJECTED';
            if (role === 'BUSINESS_HEAD') updateData.bhStatus = 'REJECTED';
            if (role === 'ADMIN') updateData.adminStatus = 'REJECTED';
        } else if (status === 'APPROVED') {
            if (role === 'HR' && request.currentLevel === 1) {
                updateData.hrStatus = 'APPROVED';
                updateData.currentLevel = 2;
            } else if (role === 'BUSINESS_HEAD' && request.currentLevel === 2) {
                updateData.bhStatus = 'APPROVED';
                updateData.currentLevel = 3;
            } else if (role === 'ADMIN' && request.currentLevel === 3) {
                updateData.adminStatus = 'APPROVED';
                updateData.status = 'APPROVED'; // Final Approval
            } else {
                return res.status(403).json({ message: 'Not authorized for this level of approval' });
            }
        }

        const updatedRequest = await prisma.wfhRequest.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json(updatedRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    createWfhRequest,
    getManageableWfhRequests,
    getMyWfhRequests,
    approveWfhRequest
};
