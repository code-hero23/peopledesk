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

        if (!logs || logs.length === 0) {
            console.log("No new call logs to sync.");
            return resolve(); // Exit successfully
        }

        // 2. Fetch User Token from Preferences since LocalStorage is inaccessible Headless
        const Preferences = Capacitor.Plugins.Preferences;
        const userPrefs = await Preferences.get({ key: 'user' });

        if (!userPrefs.value) {
            throw new Error("User credentials not found in Preferences. Cannot sync.");
        }
        const user = JSON.parse(userPrefs.value);

        // 3. POST logs to the server
        // Endpoint established from workLogRoutes and app.js
        const API_URL = 'https://cookscape-1087459196395.asia-south1.run.app/api/worklogs/sync-calls';

        const requestBody = JSON.stringify({
            logs: logs,
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
