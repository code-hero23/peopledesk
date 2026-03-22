package com.peopledesk.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.provider.CallLog;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;
import java.util.TimeZone;

public class CallLogSyncWorker extends Worker {
    private static final String TAG = "CallLogSyncWorker";
    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String API_URL = "https://peopledesk.orbixdesigns.com/api/worklogs/sync-calls";

    public CallLogSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Starting background sync work...");

        try {
            // 1. Get User Token and SIM Preference
            SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String istToday = getIstToday();

            // 2. Get User Token and SIM Preference
            String userJsonStr = prefs.getString("user", null);
            if (userJsonStr == null) {
                Log.e(TAG, "User not logged in. Aborting sync.");
                return Result.failure();
            }

            JSONObject userJson = new JSONObject(userJsonStr);
            String token = userJson.optString("token");
            if (token.isEmpty()) {
                Log.e(TAG, "User token missing. Aborting sync.");
                return Result.failure();
            }

            String officialSim = prefs.getString("cre_official_sim", "0");

            // 3. Fetch Call Logs - Skip if no SIM selected (0 is the "Unset" marker now)
            if (officialSim.equals("0")) {
                Log.d(TAG, "No default SIM selected. Skipping background sync.");
                return Result.success();
            }

            JSONArray logs = fetchLogs(officialSim);
            if (logs.length() == 0) {
                Log.d(TAG, "No logs to sync.");
                return Result.success();
            }

            // 4. Prepare Payload
            JSONObject payload = new JSONObject();
            payload.put("date", istToday);
            payload.put("calls", logs);
            payload.put("simFilter", officialSim);
            payload.put("syncDate", istToday + "T00:00:00.000Z");

            // 5. POST to VPS
            if (sendLogs(token, payload)) {
                Log.d(TAG, "Sync successful. Updating lastSyncDate.");
                prefs.edit().putString("lastBackgroundSyncDate", istToday).apply();
                return Result.success();
            } else {
                return Result.retry();
            }

        } catch (Exception e) {
            Log.e(TAG, "Sync failed: " + e.getMessage());
            return Result.failure();
        }
    }

    private String getIstToday() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("GMT+5:30"));
        int year = cal.get(Calendar.YEAR);
        int month = cal.get(Calendar.MONTH) + 1;
        int day = cal.get(Calendar.DAY_OF_MONTH);
        return String.format("%04d-%02d-%02d", year, month, day);
    }

    private JSONArray fetchLogs(String officialSim) {
        JSONArray array = new JSONArray();
        Cursor cursor = null;
        try {
            cursor = getApplicationContext().getContentResolver().query(
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

                int limit = 200;
                int count = 0;

                while (cursor.moveToNext() && count < limit) {
                    String simId = simIdIndex != -1 ? cursor.getString(simIdIndex) : "";
                    
                    // Filtering logic mirroring runner.js
                    if (!officialSim.equals("0")) {
                        String normalizedSlot = simId == null ? "" : simId.toLowerCase();
                        String normalizedTarget = officialSim.toLowerCase();
                        if (!normalizedSlot.equals(normalizedTarget) && !normalizedSlot.contains(normalizedTarget)) {
                            // Skip if mismatch, but handle single SIM fallback eventually? 
                            // For simplicity, we assume if officialSim is set, user knows what they want.
                            continue;
                        }
                    }

                    JSONObject log = new JSONObject();
                    log.put("number", cursor.getString(numberIndex));
                    log.put("name", cursor.getString(nameIndex));
                    log.put("type", getCallType(cursor.getInt(typeIndex)));
                    log.put("date", cursor.getLong(dateIndex));
                    log.put("duration", cursor.getInt(durationIndex));
                    log.put("simId", simId);
                    
                    array.put(log);
                    count++;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error fetching logs: " + e.getMessage());
        } finally {
            if (cursor != null) cursor.close();
        }
        return array;
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

    private boolean sendLogs(String token, JSONObject payload) {
        try {
            URL url = new URL(API_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PUT");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = payload.toString().getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            Log.d(TAG, "Server response code: " + code);
            return code >= 200 && code < 300;
        } catch (Exception e) {
            Log.e(TAG, "HTTP POST failed: " + e.getMessage());
            return false;
        }
    }
}
