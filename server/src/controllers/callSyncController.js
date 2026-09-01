const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const makeCode = () => crypto.randomBytes(5).toString('hex').toUpperCase();
const makeSecret = () => crypto.randomBytes(32).toString('base64url');
const REMOTE_SYNC_ACTION = 'CALL_SYNC_REMOTE_REQUEST';

const getLatestRemoteSyncRequest = async (deviceId, userId) => {
  try {
    const request = await prisma.auditLog.findFirst({
      where: {
        action: REMOTE_SYNC_ACTION,
        ...(userId ? { userId: Number(userId) } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) return null;

    try {
      const details = request.details ? JSON.parse(request.details) : {};
      return { request, details };
    } catch (e) {
      return { request, details: {} };
    }
  } catch (error) {
    console.warn('Error finding remote sync audit log:', error);
    return null;
  }
};

const createActivationCode = async (req, res) => {
  try {
    const userId = Number(req.body.userId || req.user.id);
    if (userId !== Number(req.user.id) && !['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not allowed to activate this employee device' });
    }
    const employee = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true, designation: true } });
    if (!employee || employee.status === 'BLOCKED') return res.status(404).json({ message: 'Active employee account not found' });
    await prisma.callSyncActivationCode.deleteMany({ where: { userId, OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }] } });
    const code = makeCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.callSyncActivationCode.create({ data: { userId, codeHash: hash(code), expiresAt } });
    res.status(201).json({ code, expiresAt });
  } catch (error) {
    console.error('Call sync activation error', error);
    res.status(500).json({ message: 'Could not create activation code' });
  }
};

const enrollDevice = async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const officialSim = String(req.body.officialSim || '').trim();
    if (!code || !officialSim || officialSim === '0') return res.status(400).json({ message: 'Activation code and official SIM are required' });
    const activation = await prisma.callSyncActivationCode.findFirst({ where: { codeHash: hash(code), usedAt: null, expiresAt: { gt: new Date() } } });
    if (!activation) return res.status(400).json({ message: 'Activation code is invalid or expired' });
    const secret = makeSecret();
    const device = await prisma.$transaction(async (tx) => {
      await tx.callSyncActivationCode.update({ where: { id: activation.id }, data: { usedAt: new Date() } });
      await tx.callSyncDevice.updateMany({ where: { userId: activation.userId, active: true }, data: { active: false } });
      await tx.user.update({ where: { id: activation.userId }, data: { callAnalyticsViewEnabled: true } });
      return tx.callSyncDevice.create({ data: { userId: activation.userId, deviceName: String(req.body.deviceName || '').slice(0, 120), officialSim, secretHash: hash(secret) } });
    });
    res.status(201).json({ deviceId: device.id, deviceToken: secret, officialSim });
  } catch (error) {
    console.error('Call sync enrollment error', error);
    res.status(500).json({ message: 'Could not enroll device' });
  }
};

const getSyncStatus = async (req, res) => {
  try {
    const userId = Number(req.query.userId || req.user.id);
    if (userId !== Number(req.user.id) && !['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not allowed to view this device status' });
    }
    const device = await prisma.callSyncDevice.findFirst({
      where: { userId, active: true },
      select: { id: true, deviceName: true, officialSim: true, lastAttemptAt: true, lastSuccessAt: true, lastError: true, updatedAt: true }
    });
    if (!device) return res.json({ enrolled: false, device: null });

    const latestRequest = await getLatestRemoteSyncRequest(device.id, device.userId);
    const requestedAt = latestRequest?.request?.createdAt || null;
    const requestPending = Boolean(
      requestedAt && (!device.lastSuccessAt || new Date(requestedAt).getTime() > new Date(device.lastSuccessAt).getTime())
    );

    res.json({
      enrolled: true,
      device: {
        ...device,
        requestPending,
        requestedAt,
        requestedById: latestRequest?.details?.requestedById || null
      }
    });
  } catch (error) {
    console.error('Call sync status error', error);
    res.status(500).json({ message: 'Could not load device status' });
  }
};

const requestRemoteSync = async (req, res) => {
  try {
    const userId = Number(req.body.userId || req.user.id);
    if (userId !== Number(req.user.id) && !['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not allowed to trigger sync for this employee' });
    }

    const device = await prisma.callSyncDevice.findFirst({
      where: { userId, active: true },
      select: { id: true, officialSim: true, lastSuccessAt: true, userId: true }
    });

    if (!device) {
      return res.status(400).json({ message: 'No active APK device found for this employee' });
    }

    const audit = await prisma.auditLog.create({
      data: {
        action: REMOTE_SYNC_ACTION,
        userId: device.userId,
        details: JSON.stringify({
          deviceId: device.id,
          requestedById: req.user.id,
          requestedAt: new Date().toISOString(),
          officialSim: device.officialSim || null
        })
      }
    });

    res.status(202).json({
      message: 'Sync request sent to enrolled device',
      requestedAt: audit.createdAt,
      officialSim: device.officialSim || null
    });
  } catch (error) {
    console.error('Call sync request error', error);
    res.status(500).json({ message: 'Could not request device sync' });
  }
};

const requestRemoteSyncForAll = async (req, res) => {
  try {
    if (!['ADMIN', 'HR'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not allowed to trigger sync for all employees' });
    }

    const devices = await prisma.callSyncDevice.findMany({
      where: {
        active: true,
        user: {
          status: 'ACTIVE'
        }
      },
      select: {
        id: true,
        userId: true,
        officialSim: true
      }
    });

    if (!devices.length) {
      return res.status(400).json({ message: 'No active enrolled devices found' });
    }

    const requestedAt = new Date();
    await prisma.auditLog.createMany({
      data: devices.map((device) => ({
        action: REMOTE_SYNC_ACTION,
        userId: device.userId,
        details: JSON.stringify({
          deviceId: device.id,
          requestedById: req.user.id,
          requestedAt: requestedAt.toISOString(),
          officialSim: device.officialSim || null,
          bulkRequest: true
        })
      }))
    });

    res.status(202).json({
      message: 'Sync request sent to all enrolled devices',
      requestedAt,
      requestedDevices: devices.length
    });
  } catch (error) {
    console.error('Bulk call sync request error', error);
    res.status(500).json({ message: 'Could not request sync for all employees' });
  }
};

const getPendingSyncRequest = async (req, res) => {
  try {
    const device = req.callSyncDevice;
    if (!device) return res.status(401).json({ message: 'Device is not active' });

    const latestRequest = await getLatestRemoteSyncRequest(device.id, device.userId);
    const requestedAt = latestRequest?.request?.createdAt || null;
    const pending = Boolean(
      requestedAt && (!device.lastSuccessAt || new Date(requestedAt).getTime() > new Date(device.lastSuccessAt).getTime())
    );

    res.json({
      pending,
      requestedAt,
      officialSim: device.officialSim || null
    });
  } catch (error) {
    console.error('Pending sync request check error', error);
    res.status(500).json({ message: 'Could not check pending sync request' });
  }
};

const protectDevice = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Device\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Device credential required' });
    const device = await prisma.callSyncDevice.findUnique({ where: { secretHash: hash(token) }, include: { user: true } });
    if (!device || !device.active || device.user.status === 'BLOCKED') return res.status(401).json({ message: 'Device is not active' });
    req.callSyncDevice = device;
    req.user = device.user;
    next();
  } catch (error) { next(error); }
};

const recordDeviceAttempt = async (req, res, next) => {
  const device = req.callSyncDevice;
  if (!device) return next();
  try {
    await prisma.callSyncDevice.update({ where: { id: device.id }, data: { lastAttemptAt: new Date(), lastError: null } });
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await prisma.callSyncDevice.update({ where: { id: device.id }, data: { lastSuccessAt: new Date(), lastError: null } });
        } catch (err) {
          console.error('Error updating lastSuccessAt:', err);
        }
      }
      return originalJson(body);
    };
    next();
  } catch (error) { next(error); }
};

const getBulkSyncStatus = async (req, res) => {
  try {
    if (!['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not allowed to view bulk sync status' });
    }

    const devices = await prisma.callSyncDevice.findMany({
      where: {
        active: true,
        user: {
          status: 'ACTIVE'
        }
      },
      select: {
        id: true,
        deviceName: true,
        officialSim: true,
        lastAttemptAt: true,
        lastSuccessAt: true,
        lastError: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true
          }
        }
      }
    });

    const statusList = await Promise.all(
      devices.map(async (device) => {
        const latestRequest = await getLatestRemoteSyncRequest(device.id, device.userId);
        const requestedAt = latestRequest?.request?.createdAt || null;
        const requestPending = Boolean(
          requestedAt && (!device.lastSuccessAt || new Date(requestedAt).getTime() > new Date(device.lastSuccessAt).getTime())
        );

        return {
          id: device.id,
          deviceName: device.deviceName,
          officialSim: device.officialSim,
          lastAttemptAt: device.lastAttemptAt,
          lastSuccessAt: device.lastSuccessAt,
          lastError: device.lastError,
          user: device.user,
          requestedAt,
          requestPending
        };
      })
    );

    const totalDevices = statusList.length;
    const pendingDevices = statusList.filter((d) => d.requestPending).length;
    const syncedDevices = totalDevices - pendingDevices;

    res.json({
      totalDevices,
      syncedDevices,
      pendingDevices,
      devices: statusList
    });
  } catch (error) {
    console.error('Bulk sync status error', error);
    res.status(500).json({ message: 'Could not load bulk sync status' });
  }
};

module.exports = {
  createActivationCode,
  enrollDevice,
  getSyncStatus,
  getBulkSyncStatus,
  requestRemoteSync,
  requestRemoteSyncForAll,
  getPendingSyncRequest,
  protectDevice,
  recordDeviceAttempt
};
