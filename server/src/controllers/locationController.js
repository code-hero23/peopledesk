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
        // Query only locations recorded within today's 7:00 AM - 8:00 PM IST window
        const latestLog = await prisma.aELocationLog.findFirst({
          where: { 
            userId: ae.id,
            createdAt: {
              gte: startUTC,
              lte: endUTC
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        let status = 'OFFLINE';
        let lastPingMinutesAgo = null;
        if (!isCurrentlyInWindow) {
          // Outside 7 AM - 8 PM IST
          status = 'OUT_OF_HOURS';
        } else if (latestLog) {
          const diffMinutes = Math.max(0, Math.round((now.getTime() - new Date(latestLog.createdAt).getTime()) / (1000 * 60)));
          lastPingMinutesAgo = diffMinutes;
          if (diffMinutes <= 20) {
            status = 'ONLINE';
          } else if (diffMinutes <= 60) {
            status = 'IDLE';
          } else {
            status = 'OFFLINE';
          }
        }

        return {
          user: ae,
          latestLocation: latestLog || null,
          status,
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

    res.json({
      user,
      date: dateStr,
      window: '07:00 AM – 08:00 PM IST',
      totalPoints: logs.length,
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
