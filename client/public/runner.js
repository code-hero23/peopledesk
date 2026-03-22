// runner.js - Capacitor Background Runner
// This script runs in a headless environment to sync call logs.

addEventListener('dailyCallLogSync', async (resolve, reject, args) => {
    console.log("Background Sync Triggered: dailyCallLogSync");
    try {
        const CallLogPlugin = Capacitor.Plugins.CallLog;
        const Preferences = Capacitor.Plugins.Preferences;

        if (!CallLogPlugin || !Preferences) {
            console.error("Required plugins not available in background context.");
            return resolve();
        }

        // 1. Get User and Settings
        const { value: userStr } = await Preferences.get({ key: 'user' });
        if (!userStr) {
            console.warn("No user credentials found. Aborting sync.");
            return resolve();
        }
        const user = JSON.parse(userStr);

        const { value: officialSim } = await Preferences.get({ key: 'cre_official_sim' });
        if (!officialSim || officialSim === "0") {
            console.log("No official SIM selected. Skipping sync.");
            return resolve();
        }

        const { value: savedApiUrl } = await Preferences.get({ key: 'apiUrl' });
        const API_BASE = savedApiUrl || 'https://peopledesk.orbixdesigns.com/api';
        const SYNC_URL = API_BASE + '/worklogs/sync-calls';

        // 2. Fetch Call Logs
        const logsResult = await CallLogPlugin.getCallLogs();
        const logs = logsResult.logs || [];
        if (logs.length === 0) {
            console.log("No call logs found on device.");
            return resolve();
        }

        // 3. Robust Filtering (Matches Foreground Logic)
        const targetSlot = String(officialSim).toLowerCase();
        let filteredLogs = logs.filter(log => {
            const logSlot = String(log.simSlot || log.simId || "").toLowerCase();
            if (!logSlot || logSlot === "null" || logSlot === "undefined") return false;
            return logSlot === targetSlot || logSlot.includes(targetSlot);
        });

        // Single SIM Fallback
        if (filteredLogs.length === 0 && logs.length > 0) {
            const uniqueSims = [...new Set(logs.map(l => String(l.simSlot || l.simId || "")))].filter(s => s && s !== "null" && s !== "undefined");
            if (uniqueSims.length === 1) {
                console.log("Single SIM detected. Applying auto-fallback.");
                filteredLogs = logs;
            }
        }

        if (filteredLogs.length === 0) {
            console.log("No logs match SIM selection:", officialSim);
            return resolve();
        }

        // 4. Sync
        const istToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const payload = {
            date: istToday,
            logs: filteredLogs, // CONSISTENCY: Use 'logs' as in manual sync
            simFilter: officialSim,
            syncDate: new Date().toISOString()
        };

        console.log(`Syncing ${filteredLogs.length} logs to ${SYNC_URL}`);
        const response = await fetch(SYNC_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("Background sync successful!");
            resolve();
        } else {
            console.error("Background sync failed status:", response.status);
            resolve(); // Still resolve to avoid OS retrying too aggressively if server is down
        }

    } catch (err) {
        console.error("Error in runner.js:", err.message);
        reject(err);
    }
});
