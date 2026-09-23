const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getTrackingWindowIST } = require('../utils/dateHelpers');

// Record location update from AE APK
const recordLocation = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { latitude, longitude, accuracy, batteryLevel, speed, address } = req.body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Invalid latitude or longitude' });
    }

    // Restrict live location pings to 7:00 AM - 8:00 PM Indian Standard Time (IST)
    // Server is in UTC (delayed 5h 30m)
    const { isCurrentlyInWindow } = getTrackingWindowIST(new Date());
    if (!isCurrentlyInWindow) {
      return res.status(200).json({
        message: 'Live location tracking is only active between 7:00 AM and 8:00 PM IST',
        trackingActive: false,
        ignored: true
      });
    }

    const acc = accuracy ? parseFloat(accuracy) : null;

    // Filter out coarse cell tower triangulation fixes (accuracy error > 200m)
    // to stop stationary teleportation/idle drift
    if (acc != null && acc > 200) {
      return res.status(200).json({
        message: 'Ping ignored due to coarse GPS accuracy (> 200m). Preserving anchor position.',
        accuracy: acc,
        ignored: true,
        trackingActive: true
      });
    }

    const log = await prisma.aELocationLog.create({
      data: {
        userId,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        batteryLevel: batteryLevel ? parseInt(batteryLevel, 10) : null,
        speed: speed ? parseFloat(speed) : null,
        address: address ? String(address).slice(0, 255) : null
      }
    });

    res.status(201).json({ 
      message: 'Location recorded', 
      id: log.id, 
      createdAt: log.createdAt,
      trackingActive: true 
    });
  } catch (error) {
    console.error('Record location error:', error);
    res.status(500).json({ message: 'Could not record location' });
  }
};

// Fetch real-time live location of all active AEs (Filtered to 7 AM - 8 PM IST)
const getLiveLocations = async (req, res) => {
  try {
    const now = new Date();
    const { startUTC, endUTC, isCurrentlyInWindow, currentIST } = getTrackingWindowIST(now);

    // Find all active users who are AEs, have assigned sites, or have location logs
    let aeUsers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { role: 'AE_MANAGER' },
          { designation: { contains: 'AE', mode: 'insensitive' } },
          { designation: { contains: 'Area', mode: 'insensitive' } },
          { designation: { contains: 'Architect', mode: 'insensitive' } },
          { siteAssignments: { some: {} } },
          { aeLocationLogs: { some: {} } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    if (aeUsers.length === 0) {
      aeUsers = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          role: { in: ['EMPLOYEE', 'AE_MANAGER'] }
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          designation: true,
          role: true
        },
        take: 25,
        orderBy: { name: 'asc' }
      });
    }

    const liveData = await Promise.all(
      aeUsers.map(async (ae) => {
        // Query locations recorded within today's 7:00 AM - 8:00 PM IST window (take top 2 for motion detection)
        const recentLogs = await prisma.aELocationLog.findMany({
          where: { 
            userId: ae.id,
            createdAt: {
              gte: startUTC,
              lte: endUTC
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 2
        });

        // Today's attendance records (for Multi-Site Sign-in detection: Site 1, Site 2, Site 3...)
        const dayStart = new Date(startUTC);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(endUTC);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            userId: ae.id,
            date: {
              gte: dayStart,
              lte: dayEnd
            }
          },
          orderBy: { date: 'asc' },
          select: {
            id: true,
            siteName: true,
            checkoutSiteName: true,
            latitude: true,
            longitude: true,
            locationAddress: true,
            checkoutLatitude: true,
            checkoutLongitude: true,
            checkoutLocationAddress: true,
            createdAt: true,
            date: true,
            checkoutTime: true,
            status: true
          }
        });

        // Today's scheduled Site Assignments for this AE
        const scheduledAssignments = await prisma.siteAssignment.findMany({
          where: {
            aeId: ae.id,
            scheduledDate: {
              gte: dayStart,
              lte: dayEnd
            },
            status: { notIn: ['CANCELLED'] }
          },
          orderBy: { scheduledTime: 'asc' }
        });

        // First GPS ping of today (Morning departure / Point A)
        const firstLogToday = await prisma.aELocationLog.findFirst({
          where: {
            userId: ae.id,
            createdAt: {
              gte: startUTC,
              lte: endUTC
            }
          },
          orderBy: { createdAt: 'asc' }
        });

        // Map sequential sites: Site 1, Site 2, Site 3...
        const siteSignIns = attendanceRecords
          .filter(rec => rec.siteName && rec.siteName.trim())
          .map((rec, idx) => {
            const siteNum = idx + 1;
            const isCompleted = !!rec.checkoutTime;
            return {
              id: rec.id,
              siteNumber: siteNum,
              siteName: rec.siteName.trim(),
              latitude: rec.latitude || (idx === 0 && firstLogToday ? firstLogToday.latitude : null),
              longitude: rec.longitude || (idx === 0 && firstLogToday ? firstLogToday.longitude : null),
              address: rec.locationAddress || null,
              signedInAt: rec.date || rec.createdAt,
              checkoutTime: rec.checkoutTime || null,
              checkoutSiteName: rec.checkoutSiteName || null,
              checkoutLatitude: rec.checkoutLatitude || null,
              checkoutLongitude: rec.checkoutLongitude || null,
              checkoutAddress: rec.checkoutLocationAddress || null,
              isCompleted,
              status: isCompleted ? 'COMPLETED' : 'ACTIVE'
            };
          });

        const activeSiteSignIn = siteSignIns.find(s => s.status === 'ACTIVE') || null;
        const lastCompletedSite = [...siteSignIns].reverse().find(s => s.isCompleted) || null;
        const siteSignIn = siteSignIns[0] || null;

        const latestLog = recentLogs[0] || null;
        const prevLog = recentLogs[1] || null;

        let status = 'OFFLINE';
        let isMoving = false;
        let lastPingMinutesAgo = null;

        if (!isCurrentlyInWindow) {
          // Outside 7 AM - 8 PM IST
          status = 'OUT_OF_HOURS';
        } else if (latestLog) {
          const diffMinutes = Math.max(0, Math.round((now.getTime() - new Date(latestLog.createdAt).getTime()) / (1000 * 60)));
          lastPingMinutesAgo = diffMinutes;

          // 1. Direct GPS speed check (> 0.6 m/s, ~2.2 km/h)
          if (latestLog.speed != null && latestLog.speed > 0.6) {
            isMoving = true;
          } 
          // 2. Calculated speed & distance between last 2 pings
          else if (prevLog) {
            const dLat = (latestLog.latitude - prevLog.latitude) * Math.PI / 180;
            const dLng = (latestLog.longitude - prevLog.longitude) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(prevLog.latitude * Math.PI / 180) * Math.cos(latestLog.latitude * Math.PI / 180) *
                      Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const distMeters = 6371000 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
            const timeDiffMins = Math.max(0.1, (new Date(latestLog.createdAt).getTime() - new Date(prevLog.createdAt).getTime()) / (1000 * 60));
            const calculatedKmh = (distMeters / 1000) / (timeDiffMins / 60);

            if ((distMeters >= 25 && timeDiffMins <= 15) || (calculatedKmh >= 2.5 && distMeters >= 15)) {
              isMoving = true;
            }
          }

          // 3. Site Transit check: If AE completed a site (e.g. Site 1) and is traveling toward Site 2 / next destination
          if (!isMoving && lastCompletedSite && !activeSiteSignIn && diffMinutes <= 35) {
            if (lastCompletedSite.latitude && lastCompletedSite.longitude) {
              const dLat = (latestLog.latitude - lastCompletedSite.latitude) * Math.PI / 180;
              const dLng = (latestLog.longitude - lastCompletedSite.longitude) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lastCompletedSite.latitude * Math.PI / 180) * Math.cos(latestLog.latitude * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
              const distFromCompletedSite = 6371000 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
              if (distFromCompletedSite >= 40) {
                isMoving = true;
              }
            }
          }

          // Status threshold: active online up to 30 mins; IDLE 30 - 75 mins; OFFLINE > 75 mins
          if (diffMinutes <= 30) {
            status = isMoving ? 'MOVING' : (activeSiteSignIn ? 'STATIONARY' : 'ONLINE');
          } else if (diffMinutes <= 75) {
            status = 'IDLE';
          } else {
            status = 'OFFLINE';
          }
        }

        return {
          user: ae,
          latestLocation: latestLog || null,
          previousLocation: prevLog || null,
          firstLocation: firstLogToday || null,
          siteSignIns,
          activeSiteSignIn,
          lastCompletedSite,
          siteSignIn,
          scheduledAssignments,
          activeAssignment: scheduledAssignments[0] || null,
          status,
          isMoving,
          lastPingMinutesAgo
        };
      })
    );

    res.json({
      trackingWindow: {
        isCurrentlyInWindow,
        startIST: '07:00 AM',
        endIST: '08:00 PM',
        currentIST,
        windowLabel: '7:00 AM – 8:00 PM IST'
      },
      liveData
    });
  } catch (error) {
    console.error('Get live locations error:', error);
    res.status(500).json({ message: 'Could not load live locations' });
  }
};

// Fetch daily location history / breadcrumbs for a specific AE within 7 AM - 8 PM IST
const getLocationHistory = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];

    // Constrain query strictly to 7:00 AM - 8:00 PM IST converted to UTC
    const { startUTC, endUTC } = getTrackingWindowIST(dateStr);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, designation: true, phone: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const logs = await prisma.aELocationLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startUTC,
          lte: endUTC
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const dayStart = new Date(startUTC);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(endUTC);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: dayStart, lte: dayEnd }
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        siteName: true,
        checkoutSiteName: true,
        latitude: true,
        longitude: true,
        locationAddress: true,
        checkoutLatitude: true,
        checkoutLongitude: true,
        checkoutLocationAddress: true,
        createdAt: true,
        date: true,
        checkoutTime: true
      }
    });

    const scheduledAssignments = await prisma.siteAssignment.findMany({
      where: {
        aeId: userId,
        scheduledDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED'] }
      },
      orderBy: { scheduledTime: 'asc' }
    });

    const siteSignIns = attendanceRecords
      .filter(rec => rec.siteName && rec.siteName.trim())
      .map((rec, idx) => {
        const siteNum = idx + 1;
        const isCompleted = !!rec.checkoutTime;
        return {
          id: rec.id,
          siteNumber: siteNum,
          siteName: rec.siteName.trim(),
          latitude: rec.latitude || (idx === 0 && logs[0] ? logs[0].latitude : null),
          longitude: rec.longitude || (idx === 0 && logs[0] ? logs[0].longitude : null),
          address: rec.locationAddress || null,
          signedInAt: rec.date || rec.createdAt,
          checkoutTime: rec.checkoutTime || null,
          checkoutSiteName: rec.checkoutSiteName || null,
          checkoutLatitude: rec.checkoutLatitude || null,
          checkoutLongitude: rec.checkoutLongitude || null,
          checkoutAddress: rec.checkoutLocationAddress || null,
          isCompleted,
          status: isCompleted ? 'COMPLETED' : 'ACTIVE'
        };
      });

    const activeSiteSignIn = siteSignIns.find(s => s.status === 'ACTIVE') || null;
    const lastCompletedSite = [...siteSignIns].reverse().find(s => s.isCompleted) || null;
    const siteSignIn = siteSignIns[0] || null;

    res.json({
      user,
      date: dateStr,
      window: '07:00 AM – 08:00 PM IST',
      totalPoints: logs.length,
      siteSignIns,
      activeSiteSignIn,
      lastCompletedSite,
      siteSignIn,
      scheduledAssignments,
      activeAssignment: scheduledAssignments[0] || null,
      logs
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ message: 'Could not load location history' });
  }
};

module.exports = {
  recordLocation,
  getLiveLocations,
  getLocationHistory
};
