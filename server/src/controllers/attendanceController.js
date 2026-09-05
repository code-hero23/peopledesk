const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isAeAttendanceUser = (user) => {
    const designation = (user?.designation || '').trim().toUpperCase();
    return designation === 'AE' || designation === 'AE MANAGER' || user?.role === 'AE_MANAGER';
};

const calculateDistanceInKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const nLat1 = parseFloat(lat1);
    const nLon1 = parseFloat(lon1);
    const nLat2 = parseFloat(lat2);
    const nLon2 = parseFloat(lon2);
    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (nLat2 - nLat1) * (Math.PI / 180);
    const dLon = (nLon2 - nLon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(nLat1 * (Math.PI / 180)) *
        Math.cos(nLat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return parseFloat(d.toFixed(2));
};

// @desc    Mark attendance for today
// @route   POST /api/attendance
// @access  Private (Employee)
const markAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch ALL attendance records for today
        const existingAttendances = await prisma.attendance.findMany({
            where: {
                userId,
                date: {
                    gte: today,
                },
            },
            orderBy: {
                date: 'desc' // Latest first
            }
        });

        // Current User Logic
        const isAE = isAeAttendanceUser(req.user);
        const latestAttendance = existingAttendances[0];

        // Validations
        if (latestAttendance) {
            // If the latest record is still active (no checkout), cannot create new one
            if (!latestAttendance.checkoutTime) {
                return res.status(400).json({ message: 'You are already checked in. Please check out first.' });
            }

            // If checked out, proceed based on role
            if (!isAE) {
                // Non-AE users can only have ONE record per day
                return res.status(400).json({ message: 'Attendance already marked for today' });
            }
            // If AE, and checked out, ALLOW creating new record (Fall through)
        }

        if (req.file) {
            console.log('File uploaded successfully:', req.file);
        } else {
            console.warn('No file received for check-in');
        }

        // Find user's reserved seat assignment if available
        const userSeat = await prisma.seatAssignment.findFirst({
            where: { userId }
        });

        const latitude = req.body.latitude ? parseFloat(req.body.latitude) : null;
        const longitude = req.body.longitude ? parseFloat(req.body.longitude) : null;
        const locationAddress = req.body.locationAddress || null;

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                status: 'PRESENT',
                date: new Date(),
                checkInPhoto: req.file ? `/uploads/${req.file.filename}` : null,
                deviceInfo: req.body.deviceInfo || req.headers['user-agent'],
                ipAddress: req.ip || req.connection.remoteAddress,
                seatId: userSeat ? userSeat.seatId : null,
                siteName: req.body.siteName || null,
                latitude: !isNaN(latitude) ? latitude : null,
                longitude: !isNaN(longitude) ? longitude : null,
                locationAddress: locationAddress
            },
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Checkout for today
// @route   PUT /api/attendance/checkout
// @access  Private (Employee)
const checkoutAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the LATEST attendance record for today
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: { gte: today },
            },
            orderBy: {
                date: 'desc'
            }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'No attendance record found for today' });
        }

        if (attendance.checkoutTime) {
            return res.status(400).json({ message: 'Already checked out' });
        }

        if (req.file) {
            console.log('Checkout file uploaded successfully:', req.file);
        } else {
            console.warn('No file received for check-out');
        }

        const checkoutLatitude = (req.body.latitude || req.body.checkoutLatitude) ? parseFloat(req.body.latitude || req.body.checkoutLatitude) : null;
        const checkoutLongitude = (req.body.longitude || req.body.checkoutLongitude) ? parseFloat(req.body.longitude || req.body.checkoutLongitude) : null;
        const checkoutLocationAddress = req.body.locationAddress || req.body.checkoutLocationAddress || null;
        const checkoutMismatchReason = req.body.checkoutMismatchReason || req.body.mismatchReason || null;

        let distanceKm = null;
        let isLocationMismatch = false;

        if (attendance.latitude != null && attendance.longitude != null && checkoutLatitude != null && checkoutLongitude != null) {
            distanceKm = calculateDistanceInKm(attendance.latitude, attendance.longitude, checkoutLatitude, checkoutLongitude);
            if (distanceKm !== null && distanceKm > 1.0) {
                isLocationMismatch = true;
                if (!checkoutMismatchReason || !checkoutMismatchReason.trim()) {
                    return res.status(400).json({
                        message: `Location mismatch detected (${distanceKm} km from check-in site). You must enter a reason to complete checkout.`
                    });
                }
            }
        }

        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkoutTime: new Date(),
                checkoutPhoto: req.file ? `/uploads/${req.file.filename}` : null,
                checkoutDeviceInfo: req.body.deviceInfo || req.headers['user-agent'],
                checkoutIpAddress: req.ip || req.connection.remoteAddress,
                checkoutSiteName: req.body.siteName || req.body.checkoutSiteName || null,
                checkoutLatitude: !isNaN(checkoutLatitude) ? checkoutLatitude : null,
                checkoutLongitude: !isNaN(checkoutLongitude) ? checkoutLongitude : null,
                checkoutLocationAddress: checkoutLocationAddress,
                distanceKm: distanceKm,
                isLocationMismatch: isLocationMismatch,
                checkoutMismatchReason: checkoutMismatchReason
            },
        });

        // AUTO-CLOSE ACTIVE BREAKS ON CHECKOUT
        // Find any active break (without endTime) for this attendance
        const activeBreak = await prisma.breakLog.findFirst({
            where: {
                attendanceId: attendance.id,
                endTime: null
            }
        });

        if (activeBreak) {
            const endTime = new Date();
            const startTime = new Date(activeBreak.startTime);
            const duration = Math.round((endTime - startTime) / 60000);

            await prisma.breakLog.update({
                where: { id: activeBreak.id },
                data: {
                    endTime: endTime,
                    duration: duration
                }
            });
            console.log(`Auto-closed active break (${activeBreak.breakType}) for user ${userId} on checkout`);
        }

        res.json(updatedAttendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
const pauseAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { breakType } = req.body; // TEA, LUNCH, CLIENT_MEETING, BH_MEETING
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find active attendance
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: { gte: today },
                checkoutTime: null // Must be checked in
            },
            orderBy: { date: 'desc' },
            include: { breaks: true }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'No active attendance found or already checked out.' });
        }

        // Check if already paused
        const activeBreak = attendance.breaks.find(b => !b.endTime);
        if (activeBreak) {
            return res.status(400).json({ message: 'You are already on a break.' });
        }

        // Create new break log
        const newBreak = await prisma.breakLog.create({
            data: {
                attendanceId: attendance.id,
                breakType: breakType,
                startTime: new Date()
            }
        });

        res.json({ message: 'Attendance paused', break: newBreak });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Resume attendance (End break)
// @route   POST /api/attendance/resume
// @access  Private
const resumeAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find active attendance
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: { gte: today },
                checkoutTime: null
            },
            orderBy: { date: 'desc' },
            include: { breaks: true }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'No active attendance found.' });
        }

        // Find active break
        const activeBreak = attendance.breaks.find(b => !b.endTime);
        if (!activeBreak) {
            return res.status(400).json({ message: 'You are not currently on a break.' });
        }

        // Calculate duration (minutes)
        const endTime = new Date();
        const startTime = new Date(activeBreak.startTime);
        const duration = Math.round((endTime - startTime) / 60000); // Minutes

        const updatedBreak = await prisma.breakLog.update({
            where: { id: activeBreak.id },
            data: {
                endTime: endTime,
                duration: duration
            }
        });

        res.json({ message: 'Attendance resumed', break: updatedBreak });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Check if attendance is marked for today
// @route   GET /api/attendance/today
// @access  Private
const getAttendanceStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                },
            },
            orderBy: {
                date: 'desc'
            },
            include: {
                breaks: true // Include breaks to check status
            }
        });

        // Auto-link assigned seat from SeatAssignment if attendance record has no seatId set
        if (attendance && !attendance.seatId) {
            const userSeat = await prisma.seatAssignment.findFirst({
                where: { userId }
            });
            if (userSeat) {
                attendance = await prisma.attendance.update({
                    where: { id: attendance.id },
                    data: { seatId: userSeat.seatId },
                    include: { breaks: true }
                });
            }
        }

        // Determine pause status
        let isPaused = false;
        let activeBreak = null;
        if (attendance && attendance.breaks) {
            activeBreak = attendance.breaks.find(b => !b.endTime);
            if (activeBreak) isPaused = true;
        }

        res.json({
            marked: !!attendance,
            data: attendance,
            isPaused,
            activeBreak
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get attendance history
// @route   GET /api/attendance/history
// @access  Private
const getMyAttendanceHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = {
                date: {
                    gte: new Date(startDate),
                    lte: end
                }
            };
        }

        const history = await prisma.attendance.findMany({
            where: {
                userId,
                ...dateFilter
            },
            include: {
                breaks: true, // Include breaks to calculate durations
            },
            orderBy: {
                date: 'desc'
            }
        });

        // Fetch biometric logs separately for the user in the same date range
        let biometricFilter = { userId };
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            biometricFilter.punchTime = {
                gte: new Date(startDate),
                lte: end
            };
        }

        const biometricLogs = await prisma.biometricLog.findMany({
            where: biometricFilter,
            orderBy: { punchTime: 'asc' }
        });

        // Add biometric logs to the relevant attendance records or return them alongside
        // For the frontend to group them easily, we'll attach biometricLogs to EACH attendance record 
        // that matches that date, or just return a combined object.
        // The current frontend expect them inside each attendance record.
        const historyWithBiometrics = history.map(record => ({
            ...record,
            biometricLogs: biometricLogs.filter(log => {
                // Robust IST Date comparison (YYYY-MM-DD in India)
                const toISTDateString = (date) => {
                    const d = new Date(date);
                    // Shift to IST (+5:30) for display comparison
                    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
                    return istDate.toISOString().split('T')[0];
                };
                return toISTDateString(log.punchTime) === toISTDateString(record.date);
            })
        }));

        res.json(historyWithBiometrics);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { markAttendance, checkoutAttendance, getAttendanceStatus, pauseAttendance, resumeAttendance, getMyAttendanceHistory };
