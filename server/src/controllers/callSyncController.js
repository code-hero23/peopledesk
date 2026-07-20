const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const makeCode = () => crypto.randomBytes(5).toString('hex').toUpperCase();
const makeSecret = () => crypto.randomBytes(32).toString('base64url');

const createActivationCode = async (req, res) => {
  try {
    const userId = Number(req.body.userId || req.user.id);
    if (userId !== Number(req.user.id) && !['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not allowed to activate this employee device' });
    }
    const employee = await prisma.user.findUnique({ where: { id: userId }, select: { callAnalyticsViewEnabled: true } });
    if (!employee?.callAnalyticsViewEnabled) return res.status(400).json({ message: 'Call sync is not enabled for this employee' });
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
      select: { deviceName: true, officialSim: true, lastAttemptAt: true, lastSuccessAt: true, lastError: true, updatedAt: true }
    });
    res.json({ enrolled: Boolean(device), device });
  } catch (error) {
    console.error('Call sync status error', error);
    res.status(500).json({ message: 'Could not load device status' });
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
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        prisma.callSyncDevice.update({ where: { id: device.id }, data: { lastSuccessAt: new Date(), lastError: null } }).catch(console.error);
      }
      return originalJson(body);
    };
    next();
  } catch (error) { next(error); }
};

module.exports = { createActivationCode, enrollDevice, getSyncStatus, protectDevice, recordDeviceAttempt };
