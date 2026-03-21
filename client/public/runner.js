// runner.js
// This headless script runs purely without DOM access.
addEventListener('dailyCallLogSync', async (resolve, reject) => {
    try {
        console.log("Background Task Triggered: dailyCallLogSync");

        // 1. Fetch Call Logs from Native Plugin using Capacitor Bridge
        const CallLogPlugin = Capacitor.Plugins.CallLog;
        if (!CallLogPlugin) {
            throw new Error("CallLogPlugin is unavailable in the background runner context.");
        }

        const logsResult = await CallLogPlugin.getCallLogs();
        const logs = logsResult.logs;

        // 2. Fetch User and SIM Preferences from Preferences (Headless friendly)
        const Preferences = Capacitor.Plugins.Preferences;
        const [userPrefs, simPrefs] = await Promise.all([
            Preferences.get({ key: 'user' }),
            Preferences.get({ key: 'cre_official_sim' })
        ]);
        
        if (!userPrefs.value) {
            throw new Error("User credentials not found in Preferences. Cannot sync.");
        }
        const user = JSON.parse(userPrefs.value);
        const officialSim = simPrefs.value ? String(simPrefs.value) : "0"; // Default to sync all if not set

        // 3. Filter logs by SIM slot if a specific SIM is selected
        let filteredLogs = logs;
        if (officialSim !== "0") {
            const normalizedOfficialSim = String(officialSim).toLowerCase();
            console.log(`Filtering logs for Official SIM: ${normalizedOfficialSim}`);
            
            filteredLogs = logs.filter(log => {
                const logSlot = String(log.simSlot || log.simId || "").toLowerCase();
                if (!logSlot || logSlot === "null" || logSlot === "undefined") return false;
                return logSlot === normalizedOfficialSim || logSlot.includes(normalizedOfficialSim);
            });

            // SINGLE SIM FALLBACK: If filtering resulted in 0 logs but device has logs, 
            // and there's only one unique SIM present, assume it's the official one.
            if (filteredLogs.length === 0 && logs.length > 0) {
                const uniqueSims = [...new Set(logs.map(l => String(l.simSlot || l.simId || "")))].filter(s => s && s !== "null" && s !== "undefined");
                if (uniqueSims.length === 1) {
                    console.log("Single SIM detected on device. Applying auto-fallback to sync all logs.");
                    filteredLogs = logs;
                }
            }
            
            console.log(`Final filtered count: ${filteredLogs.length} logs.`);
        }

        if (filteredLogs.length === 0) {
            console.log("No matching logs for current SIM selection.");
            return resolve();
        }

        // 4. POST logs to the VPS server
        const API_URL = 'https://peopledesk.orbixdesigns.com/api/worklogs/sync-calls';

        const requestBody = JSON.stringify({
            logs: filteredLogs,
            simFilter: officialSim,
            syncDate: new Date().toISOString()
        });

        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: requestBody
        });

        if (!response.ok) {
            throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
        }

        console.log("Call Logs synchronized successfully in background.");
        resolve(); // Always call resolve on complete

    } catch (error) {
        console.error("Background Runner Error: ", error);
        reject(error); // Reject signals failure to the OS job scheduler
    }
});
