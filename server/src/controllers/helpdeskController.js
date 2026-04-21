const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Create a new helpdesk ticket
// @route   POST /api/helpdesk
// @access  Private
const createTicket = async (req, res) => {
    const { subject, description, type, category } = req.body;

    if (!subject || !description || !type || !category) {
        return res.status(400).json({ message: 'Please provide all details' });
    }

    try {
        const ticket = await prisma.helpdeskTicket.create({
            data: {
                userId: req.user.id,
                subject,
                description,
                type,
                category,
                status: 'OPEN'
            },
            include: {
                user: {
                    select: { name: true, email: true, designation: true }
                }
            }
        });

        res.status(201).json(ticket);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get tickets based on role
// @route   GET /api/helpdesk
// @access  Private
const getTickets = async (req, res) => {
    try {
        const user = req.user;
        let tickets;

        const isHrOrCoo = user.role === 'HR' || 
                         (user.role === 'BUSINESS_HEAD' && ['COO', 'Chief Operational Officer'].includes(user.designation)) ||
                         user.role === 'ADMIN';

        if (isHrOrCoo) {
            // HR/COO/ADMIN: View all tickets
            tickets = await prisma.helpdeskTicket.findMany({
                include: {
                    user: {
                        select: { name: true, email: true, designation: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } else if (user.role === 'BUSINESS_HEAD') {
            // Business Head: View tickets of allocated employees
            tickets = await prisma.helpdeskTicket.findMany({
                where: {
                    user: {
                        reportingBhId: user.id
                    }
                },
                include: {
                    user: {
                        select: { name: true, email: true, designation: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            // Regular Employee: View own tickets
            tickets = await prisma.helpdeskTicket.findMany({
                where: {
                    userId: user.id
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        res.json(tickets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update ticket status and remarks
// @route   PUT /api/helpdesk/:id/status
// @access  Private (HR/BH/COO/ADMIN)
const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const user = req.user;

    try {
        const existingTicket = await prisma.helpdeskTicket.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        });

        if (!existingTicket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check permissions
        const isHrOrCoo = user.role === 'HR' || 
                         (user.role === 'BUSINESS_HEAD' && ['COO', 'Chief Operational Officer'].includes(user.designation)) ||
                         user.role === 'ADMIN';
        
        const isReportingBh = user.role === 'BUSINESS_HEAD' && existingTicket.user.reportingBhId === user.id;

        if (!isHrOrCoo && !isReportingBh) {
            return res.status(403).json({ message: 'Not authorized to update this ticket' });
        }

        const data = {};
        if (status) data.status = status;
        
        // Specific remarks based on role
        if (user.role === 'HR') {
            data.hrRemarks = remarks;
        } else if (user.role === 'BUSINESS_HEAD') {
            if (['COO', 'Chief Operational Officer'].includes(user.designation)) {
                data.cooRemarks = remarks;
            } else {
                data.bhRemarks = remarks;
            }
        } else if (user.role === 'ADMIN') {
            data.hrRemarks = remarks; // Admin can act as HR
        }

        const updatedTicket = await prisma.helpdeskTicket.update({
            where: { id: parseInt(id) },
            data,
            include: {
                user: {
                    select: { name: true, email: true, designation: true }
                }
            }
        });

        res.json(updatedTicket);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a helpdesk ticket (Admin only)
// @route   DELETE /api/helpdesk/:id
// @access  Private (ADMIN)
const deleteTicket = async (req, res) => {
    const { id } = req.params;

    try {
        const ticket = await prisma.helpdeskTicket.findUnique({
            where: { id: parseInt(id) }
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Only Admin can delete
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only superadmins can delete tickets' });
        }

        await prisma.helpdeskTicket.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Ticket deleted successfully', id: parseInt(id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    createTicket,
    getTickets,
    updateTicketStatus,
    deleteTicket
};
