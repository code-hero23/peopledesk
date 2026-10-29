const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const APK_DIR = path.join(__dirname, '../../uploads/apks');
const CALL_SYNC_APK_DIR = path.join(__dirname, '../../uploads/apks/call-sync');
const ROOT_DIR = path.join(__dirname, '../../../');

const resolveApkPath = (preferredName, fallbackPatterns = [], customDir = APK_DIR) => {
    const primaryPath = path.join(customDir, preferredName);
    if (fs.existsSync(primaryPath)) {
        return primaryPath;
    }

    const secondaryPath = path.join(APK_DIR, preferredName);
    if (fs.existsSync(secondaryPath)) {
        return secondaryPath;
    }

    // Check root directory fallbacks
    for (const pattern of fallbackPatterns) {
        const rootPath = path.join(ROOT_DIR, pattern);
        if (fs.existsSync(rootPath)) {
            return rootPath;
        }
    }

    // Check any .apk in customDir
    if (fs.existsSync(customDir)) {
        const files = fs.readdirSync(customDir).filter(f => f.endsWith('.apk'));
        if (files.length > 0) {
            return path.join(customDir, files[0]);
        }
    }

    return null;
};

// GET /api/downloads/call-sync-apk (Dedicated Call Sync App from subfolder)
router.get('/call-sync-apk', (req, res) => {
    const filePath = resolveApkPath('call-sync-latest.apk', [
        'peopledesk-release-latest.apk'
    ], CALL_SYNC_APK_DIR);

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Call Sync APK build is not currently available on the server.' });
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.download(filePath, 'PD-CallSync-latest.apk');
});

// GET /api/downloads/peopledesk-apk
router.get('/peopledesk-apk', (req, res) => {
    const callSyncSubfolderPath = path.join(CALL_SYNC_APK_DIR, 'call-sync-latest.apk');
    if (fs.existsSync(callSyncSubfolderPath)) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        return res.download(callSyncSubfolderPath, 'PD-CallSync-latest.apk');
    }

    const filePath = resolveApkPath('peopledesk-release-latest.apk', [
        'peopledesk-latest-v9.apk',
        'peopledesk-latest-v5.apk',
        'peopledesk-latest-v3.apk'
    ]);

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'PeopleDesk APK build is not currently available on the server.' });
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.download(filePath, 'PD-CallSync-latest.apk');
});

// GET /api/downloads/ae-manager-apk
router.get('/ae-manager-apk', (req, res) => {
    const filePath = resolveApkPath('ae-manager-latest.apk', [
        'peopledesk-latest-v9.apk',
        'peopledesk-latest-v5.apk'
    ]);

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'AE Manager APK build is not currently available on the server.' });
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.download(filePath, 'AEManager-latest.apk');
});

// GET /api/downloads/info
router.get('/info', (req, res) => {
    const peopledeskPath = resolveApkPath('call-sync-latest.apk', ['peopledesk-release-latest.apk', 'peopledesk-latest-v9.apk'], CALL_SYNC_APK_DIR);
    const aeManagerPath = resolveApkPath('ae-manager-latest.apk', ['peopledesk-latest-v9.apk']);

    const getStats = (p) => {
        if (!p || !fs.existsSync(p)) return { available: false };
        const stats = fs.statSync(p);
        return {
            available: true,
            sizeBytes: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(1) + ' MB',
            updatedAt: stats.mtime
        };
    };

    return res.json({
        peopledesk: {
            name: 'PD Call Sync App',
            downloadUrl: '/api/downloads/call-sync-apk',
            ...getStats(peopledeskPath)
        },
        aeManager: {
            name: 'AE Manager (Live Tracking & Field Operations)',
            downloadUrl: '/api/downloads/ae-manager-apk',
            ...getStats(aeManagerPath)
        }
    });
});

module.exports = router;
