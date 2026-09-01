const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    const log = await prisma.aELocationLog.create({
      data: {
        userId,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        batteryLevel: batteryLevel ? parseInt(batteryLevel, 10) : null,
        speed: speed ? parseFloat(speed) : null,
        address: address ? String(address).slice(0, 255) : null
      }
    });

    res.status(201).json({ message: 'Location recorded', id: log.id, createdAt: log.createdAt });
  } catch (error) {
    console.error('Record location error:', error);
    res.status(500).json({ message: 'Could not record location' });
  }
};

// Fetch real-time live location of all active AEs
const getLiveLocations = async (req, res) => {
  try {
    // Find all users who are AEs (by designation or role)
    const aeUsers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { designation: { contains: 'AE', mode: 'insensitive' } },
          { role: 'EMPLOYEE', designation: { contains: 'Architectural Executive', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        role: true
      }
    });

    const now = new Date();

    const liveData = await Promise.all(
      aeUsers.map(async (ae) => {
        const latestLog = await prisma.aELocationLog.findFirst({
          where: { userId: ae.id },
          orderBy: { createdAt: 'desc' }
        });

        let status = 'OFFLINE';
        if (latestLog) {
          const diffMinutes = (now.getTime() - new Date(latestLog.createdAt).getTime()) / (1000 * 60);
          if (diffMinutes <= 15) {
            status = 'ONLINE';
          } else if (diffMinutes <= 60) {
            status = 'IDLE';
          }
        }

        return {
          user: ae,
          latestLocation: latestLog || null,
          status
        };
      })
    );

    res.json(liveData);
  } catch (error) {
    console.error('Get live locations error:', error);
    res.status(500).json({ message: 'Could not load live locations' });
  }
};

// Fetch daily location history / breadcrumbs for a specific AE
const getLocationHistory = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

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
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      user,
      date: dateStr,
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
