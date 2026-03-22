package com.peopledesk.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.provider.CallLog;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

public class CallLogSyncWorker extends Worker {
    private static final String TAG = "CallLogSyncWorker";
    private static final String PREFS_NAME = "CapacitorStorage";

    public CallLogSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Starting automatic call log sync...");
        
        try {
            SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String authToken = prefs.getString("authToken", null);

            if (apiUrl == null) {
                Log.e(TAG, "Sync failed: apiUrl not found in Preferences");
                return Result.failure();
            }

            if (authToken == null) {
                Log.e(TAG, "Sync failed: authToken not found in Preferences");
                return Result.failure();
            }

            if (officialSim == null) {
                Log.w(TAG, "Sync skipped: official SIM not selected yet");
                return Result.success();
            }

            Log.d(TAG, "Syncing with API: " + apiUrl + " | Official SIM: " + officialSim);

            // Fetch logs
            JSONArray logs = fetchLogs(officialSim, simLabelsJson);
            if (logs.length() == 0) {
                Log.d(TAG, "No logs found to sync for SIM: " + officialSim);
                return Result.success();
            }

            // Send to server
            boolean success = sendLogs(apiUrl, authToken, logs);
            if (success) {
                Log.d(TAG, "Successfully synced " + logs.length() + " logs");
                return Result.success();
            } else {
                Log.e(TAG, "Failed to send logs to server");
                return Result.retry();
            }

        } catch (Exception e) {
            Log.e(TAG, "Critical error during sync", e);
            return Result.failure();
        }
    }

    private JSONArray fetchLogs(String officialSim, String simLabelsJson) {
        JSONArray callLogs = new JSONArray();
        try {
            // Parse sim labels for slot mapping fallback if needed
            JSONObject simLabels = new JSONObject(simLabelsJson);
            
            Cursor cursor = getApplicationContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                null, null, null,
                CallLog.Calls.DATE + " DESC"
            );

            if (cursor != null) {
                int numberIndex = cursor.getColumnIndex(CallLog.Calls.NUMBER);
                int typeIndex = cursor.getColumnIndex(CallLog.Calls.TYPE);
                int dateIndex = cursor.getColumnIndex(CallLog.Calls.DATE);
                int durationIndex = cursor.getColumnIndex(CallLog.Calls.DURATION);
                int nameIndex = cursor.getColumnIndex(CallLog.Calls.CACHED_NAME);
                int simIdIndex = cursor.getColumnIndex(CallLog.Calls.PHONE_ACCOUNT_ID);
                int simLabelIndex = cursor.getColumnIndex("phone_account_label");

                // Pre-fetch active SIMs for real-time label matching
                Map<String, String> labelMap = new HashMap<>();
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP_MR1) {
                    SubscriptionManager sm = (SubscriptionManager) getApplicationContext().getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null) {
                        List<SubscriptionInfo> activeList = sm.getActiveSubscriptionInfoList();
                        if (activeList != null) {
                            for (SubscriptionInfo si : activeList) {
                                String carrier = si.getCarrierName() != null ? si.getCarrierName().toString() : si.getDisplayName().toString();
                                labelMap.put(String.valueOf(si.getSubscriptionId()), carrier);
                            }
                        }
                    }
                }

                int count = 0;
                int limit = 200; // Limit per sync burst

                while (cursor.moveToNext() && count < limit) {
                    String simId = simIdIndex != -1 ? cursor.getString(simIdIndex) : null;
                    String simLabel = simLabelIndex != -1 ? cursor.getString(simLabelIndex) : "Unknown";
                    
                    // Priority matching: Real-time label from ID
                    if (simId != null && labelMap.containsKey(simId)) {
                        simLabel = labelMap.get(simId);
                    }

                    // MATCHING LOGIC (Match officialSim against ID or Label)
                    boolean matches = false;
                    if (simId != null && simId.equals(officialSim)) matches = true;
                    if (simLabel != null && simLabel.equalsIgnoreCase(officialSim)) matches = true;

                    if (matches) {
                        JSONObject log = new JSONObject();
                        log.put("number", cursor.getString(numberIndex));
                        log.put("name", cursor.getString(nameIndex));
                        log.put("type", getCallType(cursor.getInt(typeIndex)));
                        log.put("date", cursor.getLong(dateIndex));
                        log.put("duration", cursor.getInt(durationIndex));
                        log.put("simLabel", simLabel);
                        
                        callLogs.put(log);
                        count++;
                    }
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error fetching logs", e);
        }
        return callLogs;
    }

    private String getCallType(int type) {
        switch (type) {
            case CallLog.Calls.INCOMING_TYPE: return "INCOMING";
            case CallLog.Calls.OUTGOING_TYPE: return "OUTGOING";
            case CallLog.Calls.MISSED_TYPE: return "MISSED";
            case CallLog.Calls.REJECTED_TYPE: return "REJECTED";
            default: return "OTHER";
        }
    }

    private boolean sendLogs(String baseUrl, String authToken, JSONArray logs) {
        try {
            String fullUrl = baseUrl;
            if (!fullUrl.endsWith("/")) fullUrl += "/";
            fullUrl += "worklogs/sync-calls";

            URL url = new URL(fullUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PUT");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + authToken);
            conn.setDoOutput(true);

            JSONObject payload = new JSONObject();
            payload.put("logs", logs);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = payload.toString().getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            Log.d(TAG, "Server responded with code: " + code);
            return code >= 200 && code < 300;

        } catch (Exception e) {
            Log.e(TAG, "Error sending logs", e);
            return false;
        }
    }
}
