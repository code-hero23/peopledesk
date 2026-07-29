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
import java.util.Calendar;
import java.util.TimeZone;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;

public class CallLogSyncWorker extends Worker {
    private static final String TAG = "CallLogSyncWorker";
    private static final String PREFS_NAME = "CapacitorStorage";

    private String normalizePhoneNumber(String value) {
        if (value == null) return "";
        return value.replaceAll("\\D", "");
    }

    private String getOptionalColumn(Cursor cursor, String columnName) {
        int index = cursor.getColumnIndex(columnName);
        return index != -1 ? cursor.getString(index) : null;
    }

    private String normalizeSimSlotValue(String simSlot, String simId) {
        if (simSlot != null && !simSlot.trim().isEmpty() && !"0".equals(simSlot.trim())) {
            return simSlot.trim();
        }
        if (simId != null && simId.matches("\\d{1,2}")) {
            try {
                int parsedSimId = Integer.parseInt(simId);
                if (parsedSimId >= 1 && parsedSimId <= 2) {
                    return String.valueOf(parsedSimId);
                }
                if (parsedSimId >= 0 && parsedSimId <= 1) {
                    return String.valueOf(parsedSimId + 1);
                }
            } catch (NumberFormatException ignored) {}
        }
        return simSlot != null && !simSlot.trim().isEmpty() ? simSlot.trim() : "0";
    }

    public CallLogSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Starting automatic call log sync...");
        
        try {
            SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String apiUrl = prefs.getString("apiUrl", null);
            String deviceToken = prefs.getString("call_sync_device_token", null);
            String officialSim = prefs.getString("cre_official_sim", null);
            String simLabelsJson = prefs.getString("sim_labels", "{}");

            if (apiUrl == null) {
                Log.e(TAG, "Sync failed: apiUrl not found in Preferences");
                return Result.failure();
            }

            if (deviceToken == null) {
                Log.e(TAG, "Sync skipped: APK has not been activated");
                return Result.failure();
            }

            if (officialSim == null) {
                Log.w(TAG, "Sync skipped: official SIM not selected yet");
                return Result.success();
            }

            boolean forceSync = getInputData().getBoolean("forceSync", false);
            boolean remoteSyncRequested = hasPendingRemoteSyncRequest(apiUrl, deviceToken);
            if (!forceSync && !remoteSyncRequested && !isWithinWorkWindow()) {
                Log.d(TAG, "Sync skipped outside 10:30-19:00 IST work window");
                return Result.success();
            }

            if (ContextCompat   .checkSelfPermission(getApplicationContext(), android.Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "Sync skipped: READ_CALL_LOG permission is not granted");
                return Result.failure();
            }

            Log.d(TAG, "Syncing device call logs for official SIM: " + officialSim + " | forceSync=" + forceSync + " | remoteRequest=" + remoteSyncRequested);

            // Fetch logs
            JSONArray logs = fetchLogs(officialSim, simLabelsJson);

            // Send to server
            boolean success = sendLogs(apiUrl, deviceToken, officialSim, logs);
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

    private boolean isWithinWorkWindow() {
        Calendar now = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        int minutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        return minutes >= (10 * 60 + 30) && minutes <= (19 * 60);
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
                Map<String, String> slotMap = new HashMap<>();
                Map<String, String> labelToSlotMap = new HashMap<>();
                Map<String, String> numberToSlotMap = new HashMap<>();
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP_MR1) {
                    SubscriptionManager sm = (SubscriptionManager) getApplicationContext().getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null) {
                        List<SubscriptionInfo> activeList = sm.getActiveSubscriptionInfoList();
                        if (activeList != null) {
                            for (SubscriptionInfo si : activeList) {
                                String id = String.valueOf(si.getSubscriptionId());
                                String iccId = null;
                                try {
                                    iccId = si.getIccId();
                                } catch (Exception ignored) {}
                                String carrier = si.getCarrierName() != null ? si.getCarrierName().toString() : si.getDisplayName().toString();
                                String display = si.getDisplayName() != null ? si.getDisplayName().toString() : carrier;
                                String slot = String.valueOf(si.getSimSlotIndex() + 1);
                                labelMap.put(id, carrier);
                                slotMap.put(id, slot);
                                if (iccId != null && !iccId.isEmpty()) {
                                    labelMap.put(iccId, carrier);
                                    slotMap.put(iccId, slot);
                                }
                                try {
                                    String number = si.getNumber();
                                    String normalizedNumber = normalizePhoneNumber(number);
                                    if (!normalizedNumber.isEmpty()) {
                                        numberToSlotMap.put(normalizedNumber, slot);
                                    }
                                } catch (Exception ignored) {}
                                if (carrier != null) labelToSlotMap.put(carrier.trim().toLowerCase(), slot);
                                if (display != null) labelToSlotMap.put(display.trim().toLowerCase(), slot);
                            }
                        }
                    }
                }

                int count = 0;
                int limit = 200; // Limit per sync burst

                Map<String, Integer> diagnosticCounts = new HashMap<>();

                while (cursor.moveToNext() && count < limit) {
                    String simId = simIdIndex != -1 ? cursor.getString(simIdIndex) : null;
                    String simLabel = simLabelIndex != -1 ? cursor.getString(simLabelIndex) : "Unknown";
                    String subscriptionId = getOptionalColumn(cursor, "subscription_id");
                    String legacySimId = getOptionalColumn(cursor, "simid");
                    String accountAddress = getOptionalColumn(cursor, "phone_account_address");
                    String phoneAccountId = getOptionalColumn(cursor, "phone_account_id");
                    String normalizedAccountAddress = normalizePhoneNumber(accountAddress);
                    
                    // Priority matching: Real-time label from ID
                    if (simId != null && labelMap.containsKey(simId)) {
                        simLabel = labelMap.get(simId);
                    } else if (subscriptionId != null && labelMap.containsKey(subscriptionId)) {
                        simLabel = labelMap.get(subscriptionId);
                    } else if (legacySimId != null && labelMap.containsKey(legacySimId)) {
                        simLabel = labelMap.get(legacySimId);
                    }

                    String simSlot = "0";
                    if (simId != null && slotMap.containsKey(simId)) {
                        simSlot = slotMap.get(simId);
                    } else if (subscriptionId != null && slotMap.containsKey(subscriptionId)) {
                        simSlot = slotMap.get(subscriptionId);
                    } else if (legacySimId != null && slotMap.containsKey(legacySimId)) {
                        simSlot = slotMap.get(legacySimId);
                    } else if (!normalizedAccountAddress.isEmpty() && numberToSlotMap.containsKey(normalizedAccountAddress)) {
                        simSlot = numberToSlotMap.get(normalizedAccountAddress);
                    } else if (simLabel != null && labelToSlotMap.containsKey(simLabel.trim().toLowerCase())) {
                        simSlot = labelToSlotMap.get(simLabel.trim().toLowerCase());
                    } else if (simId != null && simId.matches("\\d{1,2}")) {
                        try {
                            int parsedSimId = Integer.parseInt(simId);
                            if (parsedSimId >= 1 && parsedSimId <= 2) {
                                // Some devices already expose the human-readable slot number directly.
                                simSlot = String.valueOf(parsedSimId);
                            } else if (parsedSimId >= 0 && parsedSimId <= 1) {
                                // Other devices expose zero-based slots (0/1).
                                simSlot = String.valueOf(parsedSimId + 1);
                            }
                        } catch (NumberFormatException ignored) {}
                    }

                    simSlot = normalizeSimSlotValue(simSlot, simId);

                    if ((simLabel == null || simLabel.equalsIgnoreCase("Unknown")) && simLabels.has(simSlot)) {
                        simLabel = simLabels.optString(simSlot, simLabel);
                    }

                    JSONObject log = new JSONObject();
                    log.put("number", cursor.getString(numberIndex));
                    log.put("name", cursor.getString(nameIndex));
                    log.put("type", getCallType(cursor.getInt(typeIndex)));
                    log.put("date", cursor.getLong(dateIndex));
                    log.put("duration", cursor.getInt(durationIndex));
                    log.put("simId", simId != null ? simId : "");
                    log.put("legacySimId", legacySimId != null ? legacySimId : "");
                    log.put("simLabel", simLabel);
                    log.put("simSlot", simSlot);
                    log.put("subscriptionId", subscriptionId != null ? subscriptionId : "");
                    log.put("phoneAccountAddress", accountAddress != null ? accountAddress : "");
                    log.put("phoneAccountId", phoneAccountId != null ? phoneAccountId : "");

                    String diagnosticKey = "slot=" + simSlot + "|simId=" + (simId != null ? simId : "") + "|sub=" + (subscriptionId != null ? subscriptionId : "") + "|label=" + (simLabel != null ? simLabel : "");
                    diagnosticCounts.put(diagnosticKey, diagnosticCounts.getOrDefault(diagnosticKey, 0) + 1);

                    callLogs.put(log);
                    count++;
                }
                Log.d(TAG, "Collected " + count + " raw call logs for server-side SIM filtering. officialSim=" + officialSim + " diagnostics=" + diagnosticCounts.toString());
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

    private boolean sendLogs(String baseUrl, String deviceToken, String officialSim, JSONArray logs) {
        try {
            String fullUrl = baseUrl;
            if (!fullUrl.endsWith("/")) fullUrl += "/";
            fullUrl += "call-sync/sync";

            URL url = new URL(fullUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PUT");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Device " + deviceToken);
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(30000);
            conn.setDoOutput(true);

            JSONObject payload = new JSONObject();
            payload.put("logs", logs);
            payload.put("simFilter", officialSim);

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

    private boolean hasPendingRemoteSyncRequest(String baseUrl, String deviceToken) {
        try {
            String fullUrl = baseUrl;
            if (!fullUrl.endsWith("/")) fullUrl += "/";
            fullUrl += "call-sync/pending";

            URL url = new URL(fullUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Device " + deviceToken);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                Log.w(TAG, "Pending remote sync check returned code: " + code);
                return false;
            }

            String body;
            try (Scanner scanner = new Scanner(conn.getInputStream(), "utf-8").useDelimiter("\\A")) {
                body = scanner.hasNext() ? scanner.next() : "{}";
            }

            JSONObject response = new JSONObject(body);
            return response.optBoolean("pending", false);
        } catch (Exception e) {
            Log.w(TAG, "Could not check pending remote sync request", e);
            return false;
        }
    }
}
