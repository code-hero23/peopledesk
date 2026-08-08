const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to seed all 91 default seats if table is empty
const ensureAllSeatsInitialized = async () => {
    const count = await prisma.seatAssignment.count();
    if (count >= 91) return;

    const defaultSeats = [];

    // Level 1: 16 Seats (L1/1 to L1/16)
    for (let i = 1; i <= 16; i++) {
        defaultSeats.push({ seatId: `L1/${i}`, level: 1, status: 'AVAILABLE' });
    }
    // Level 2: 13 Seats (L2/1 to L2/13)
    for (let i = 1; i <= 13; i++) {
        defaultSeats.push({ seatId: `L2/${i}`, level: 2, status: 'AVAILABLE' });
    }
    // Level 3: 16 Seats (L3/1 to L3/16)
    for (let i = 1; i <= 16; i++) {
        defaultSeats.push({ seatId: `L3/${i}`, level: 3, status: 'AVAILABLE' });
    }
    // Level 4: 46 Seats (L4/1 to L4/46)
    for (let i = 1; i <= 46; i++) {
        defaultSeats.push({ seatId: `L4/${i}`, level: 4, status: 'AVAILABLE' });
    }

    for (const seat of defaultSeats) {
        await prisma.seatAssignment.upsert({
            where: { seatId: seat.seatId },
            update: {},
            create: seat,
        });
    }
};

// GET /api/seating/layout
const getSeatingLayout = async (req, res) => {
    try {
        await ensureAllSeatsInitialized();

        const seats = await prisma.seatAssignment.findMany({
            include: {
                user: {
                    select: { id: true, name: true, designation: true }
                }
            },
            orderBy: { id: 'asc' }
        });

        // Get today's attendance to attach check-in time for occupied seats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const attendances = await prisma.attendance.findMany({
            where: {
                createdAt: { gte: todayStart }
            },
            select: { userId: true, createdAt: true, seatId: true }
        });

        const attendanceMap = new Map();
        attendances.forEach(att => {
            attendanceMap.set(att.userId, att.createdAt);
        });

        const formattedSeats = seats.map(seat => {
            const checkInTime = seat.userId ? attendanceMap.get(seat.userId) || null : null;
            return {
                ...seat,
                checkInTime
            };
        });

        const stats = {
            total: formattedSeats.length,
            available: formattedSeats.filter(s => s.status === 'AVAILABLE').length,
            occupied: formattedSeats.filter(s => s.status === 'OCCUPIED').length,
            reserved: formattedSeats.filter(s => s.status === 'RESERVED').length,
            clientReserved: formattedSeats.filter(s => s.status === 'CLIENT_RESERVED').length,
            blocked: formattedSeats.filter(s => s.status === 'BLOCKED').length,
            level1: formattedSeats.filter(s => s.level === 1),
            level2: formattedSeats.filter(s => s.level === 2),
            level3: formattedSeats.filter(s => s.level === 3),
            level4: formattedSeats.filter(s => s.level === 4),
        };

        res.json({
            stats,
            seats: formattedSeats
        });
    } catch (error) {
        console.error('Error fetching seating layout:', error);
        res.status(500).json({ message: 'Failed to fetch seating layout' });
    }
};

// POST /api/seating/assign
const assignSeat = async (req, res) => {
    try {
        const { seatId } = req.body;
        const userId = req.user.id;

        if (!seatId) {
            return res.status(400).json({ message: 'Seat ID is required' });
        }

        await ensureAllSeatsInitialized();

        const targetSeat = await prisma.seatAssignment.findUnique({
            where: { seatId }
        });

        if (!targetSeat) {
            return res.status(404).json({ message: 'Seat not found' });
        }

        if (targetSeat.status === 'OCCUPIED' && targetSeat.userId !== userId) {
            return res.status(400).json({ message: 'This seat is already occupied by another user' });
        }

        if (targetSeat.status === 'BLOCKED') {
            return res.status(400).json({ message: 'This seat is blocked for maintenance' });
        }

        // Release user's previous seat if any
        await prisma.seatAssignment.updateMany({
            where: { userId: userId },
            data: { status: 'AVAILABLE', userId: null, clientNote: null }
        });

        // Assign new seat
        const updatedSeat = await prisma.seatAssignment.update({
            where: { seatId },
            data: {
                status: 'OCCUPIED',
                userId: userId,
                clientNote: null,
                date: new Date()
            },
            include: {
                user: { select: { id: true, name: true, designation: true } }
            }
        });

        // Update today's attendance record with chosen seatId
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        await prisma.attendance.updateMany({
            where: {
                userId: userId,
                createdAt: { gte: todayStart }
            },
            data: { seatId: seatId }
        });

        res.json({ message: `Seat ${seatId} successfully assigned`, seat: updatedSeat });
    } catch (error) {
        console.error('Error assigning seat:', error);
        res.status(500).json({ message: 'Failed to assign seat' });
    }
};

// POST /api/seating/release
const releaseSeat = async (req, res) => {
    try {
        const userId = req.user.id;

        await prisma.seatAssignment.updateMany({
            where: { userId },
            data: { status: 'AVAILABLE', userId: null, clientNote: null }
        });

        res.json({ message: 'Seat released successfully' });
    } catch (error) {
        console.error('Error releasing seat:', error);
        res.status(500).json({ message: 'Failed to release seat' });
    }
};

// PUT /api/seating/admin/update-status
const updateSeatStatusByAdmin = async (req, res) => {
    try {
        const { seatId, seatIds, status, userId, clientNote } = req.body;
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;
        const isPrivileged = currentUserRole === 'ADMIN' || currentUserRole === 'HR';

        const targets = seatIds && Array.isArray(seatIds) && seatIds.length > 0 
            ? seatIds 
            : (seatId ? [seatId] : []);

        if (targets.length === 0 || !status) {
            return res.status(400).json({ message: 'Seat ID(s) and status are required' });
        }

        await prisma.seatAssignment.updateMany({
            where: { seatId: { in: targets } },
            data: {
                status,
                clientNote: status === 'CLIENT_RESERVED' ? (clientNote || 'Client Guest Seat') : null,
                userId: (status === 'AVAILABLE' || status === 'BLOCKED' || status === 'CLIENT_RESERVED') ? null : (userId || null)
            }
        });

        res.json({ message: `${targets.length} seat(s) updated to ${status}` });
    } catch (error) {
        console.error('Error updating seat status:', error);
        res.status(500).json({ message: 'Failed to update seat status' });
    }
};

module.exports = {
    getSeatingLayout,
    assignSeat,
    releaseSeat,
    updateSeatStatusByAdmin
};
