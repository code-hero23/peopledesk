const safeLog = (msg) => {
    try {
        if (typeof BackgroundRunner !== 'undefined' && BackgroundRunner.log) {
            BackgroundRunner.log({ message: String(msg) });
        }
        console.log(msg);
    } catch (e) {}
};

BackgroundRunner.on('dailyCallLogSync', async (event) => {
    try {
        safeLog("Background Task Triggered: dailyCallLogSync");

        // 1. Core Services Setup - v3 Standard
        let CallLogPlugin = BackgroundRunner.plugins.CallLog;
        let Preferences = BackgroundRunner.plugins.Preferences;
        
        // Fallback for older Capacitor environments or different registration names
        if (!CallLogPlugin) CallLogPlugin = (typeof Capacitor !== 'undefined') ? Capacitor.Plugins.CallLog : null;
        if (!Preferences) Preferences = (typeof Capacitor !== 'undefined') ? Capacitor.Plugins.Preferences : null;

        safeLog("Checking plugins...");
        if (!CallLogPlugin || !Preferences) {
            safeLog("Required plugins (CallLog or Preferences) are missing.");
            return event.resolve({ status: 'error', message: 'Plugins missing' });
        }

        // 2. IST Time Calculation (UTC + 5.5)
        const getIST = () => {
            const d = new Date();
            const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
            return new Date(utc + (3600000 * 5.5));
        };

        const istNow = getIST();
        const istHours = istNow.getHours();
        const istMinutes = istNow.getMinutes();
        const todayStr = istNow.toISOString().split('T')[0];

        // 3. Phase Definitions (H, M, Label)
        const PHASES = [
            { h: 11, m: 0, label: "Phase 1 (11:00 AM)" },
            { h: 12, m: 0, label: "Phase 2 (12:00 PM)" },
            { h: 14, m: 0, label: "Phase 3 (02:00 PM)" },
            { h: 16, m: 0, label: "Phase 4 (04:00 PM)" },
            { h: 18, m: 50, label: "Phase 5 (06:50 PM)" }
        ];

        // 4. Persistence Check: Avoid Duplicate Syncs per Phase
        const { value: lastSyncData } = await Preferences.get({ key: 'last_synced_report' });
        let syncStatus = lastSyncData ? JSON.parse(lastSyncData) : { date: "", phases: [] };

        if (syncStatus.date !== todayStr) {
            syncStatus = { date: todayStr, phases: [] };
        }

        // 5. Window Logic (Target Time to Target Time + 15 mins)
        let activePhaseIndex = -1;
        for (let i = 0; i < PHASES.length; i++) {
            const phase = PHASES[i];
            const targetTotalMinutes = (phase.h * 60) + phase.m;
            const currentTotalMinutes = (istHours * 60) + istMinutes;
            
            if (currentTotalMinutes >= targetTotalMinutes && 
                currentTotalMinutes < targetTotalMinutes + 15 && 
                !syncStatus.phases.includes(i)) {
                activePhaseIndex = i;
                break;
            }
        }

        if (activePhaseIndex === -1) {
            safeLog(`Not in a sync window. (IST: ${istHours}:${istMinutes})`);
            return event.resolve({ status: 'skipping', reason: 'out_of_window' });
        }

        safeLog(`Triggering Sync: ${PHASES[activePhaseIndex].label}`);

        // 6. Fetch User & Official SIM Prefs
        const [userPrefs, simPrefs] = await Promise.all([
            Preferences.get({ key: 'user' }),
            Preferences.get({ key: 'cre_official_sim' })
        ]);

        if (!userPrefs.value) {
            throw new Error("User credentials not found.");
        }
        
        const user = JSON.parse(userPrefs.value);
        const officialSim = simPrefs.value || "2";

        // 7. Data Gathering & Transformation
        const logsResult = await CallLogPlugin.getCallLogs();
        const logs = logsResult.logs;

        if (!logs || logs.length === 0) {
            safeLog("No call logs found on device.");
            return event.resolve({ status: 'success', message: 'no_logs' });
        }

        let filteredLogs = logs.filter(log => {
            const logSlot = String(log.simSlot || log.simId || "");
            if (!logSlot || logSlot === "null" || logSlot === "undefined") return true;
            return logSlot === officialSim || logSlot.includes(officialSim);
        });

        // 8. Network Transmission
        const API_URL = 'https://peopledesk.orbixdesigns.com/api/worklogs/sync-calls';
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({
                logs: filteredLogs,
                syncDate: istNow.toISOString(),
                simFilter: officialSim,
                automatedSync: true,
                phase: PHASES[activePhaseIndex].label
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        // 9. Update Persistence on Success
        syncStatus.phases.push(activePhaseIndex);
        await Preferences.set({
            key: 'last_synced_report',
            value: JSON.stringify(syncStatus)
        });

        safeLog(`Sync Successful: ${PHASES[activePhaseIndex].label}`);
        event.resolve({ status: 'success', phase: activePhaseIndex });

    } catch (error) {
        safeLog("Background Runner Failure: " + error.message);
        event.reject({ error: error.message });
    }
});
