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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.Set;
import java.util.Calendar;
import java.util.TimeZone;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;

public class CallLogSyncWorker extends Worker {
    private static final String TAG = "CallLogSyncWorker";
    private static final String PREFS_NAME = "CapacitorStorage";

    private static String normalizePhoneNumber(String value) {
        if (value == null) return "";
        return value.replaceAll("\\D", "");
    }

    private static String getOptionalColumn(Cursor cursor, String columnName) {
        int index = cursor.getColumnIndex(columnName);
        return index != -1 ? cursor.getString(index) : null;
    }

    private static String normalizeSimSlotValue(String simSlot, String simId) {
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

    private static void registerLabelSlotMapping(String label, String slot, Map<String, String> labelToSlotMap, Map<String, Integer> labelFrequencyMap, Set<String> seenKeys) {
        if (label == null) return;
        String key = label.trim().toLowerCase();
        if (key.isEmpty() || seenKeys.contains(key)) return;

        seenKeys.add(key);
        int count = labelFrequencyMap.containsKey(key) ? labelFrequencyMap.get(key) + 1 : 1;
        labelFrequencyMap.put(key, count);

        if (count == 1) {
            labelToSlotMap.put(key, slot);
        } else {
            labelToSlotMap.remove(key);
        }
    }

    public CallLogSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    public static String readPreference(Context context, String key, String defaultValue) {
        SharedPreferences capPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (capPrefs.contains(key)) return capPrefs.getString(key, defaultValue);
        if (capPrefs.contains("_CapacitorStorage_" + key)) return capPrefs.getString("_CapacitorStorage_" + key, defaultValue);
        if (capPrefs.contains("CapacitorStorage." + key)) return capPrefs.getString("CapacitorStorage." + key, defaultValue);

        try {
            SharedPreferences defPrefs = android.preference.PreferenceManager.getDefaultSharedPreferences(context);
            if (defPrefs.contains(key)) return defPrefs.getString(key, defaultValue);
            if (defPrefs.contains("_CapacitorStorage_" + key)) return defPrefs.getString("_CapacitorStorage_" + key, defaultValue);
        } catch (Exception ignored) {}

        return defaultValue;
    }

    @NonNull
    @Override
    public Result doWork() {
        boolean forceSync = getInputData().getBoolean("forceSync", false);
        boolean success = performSync(getApplicationContext(), forceSync);
        return success ? Result.success() : Result.retry();
    }

    public static boolean performSync(Context context, boolean forceSync) {
        Log.d(TAG, "Starting automatic call log sync...");
        try {
            String apiUrl = readPreference(context, "apiUrl", "https://peopledesk.orbixdesigns.com/api");
            String deviceToken = readPreference(context, "call_sync_device_token", null);
            String officialSim = readPreference(context, "cre_official_sim", "1");
            String simLabelsJson = readPreference(context, "sim_labels", "{}");

            if (deviceToken == null) {
                Log.e(TAG, "Sync skipped: APK has not been activated (deviceToken null)");
                return true;
            }

            boolean remoteSyncRequested = hasPendingRemoteSyncRequest(apiUrl, deviceToken);
            if (!forceSync && !remoteSyncRequested && !isWithinWorkWindow()) {
                Log.d(TAG, "Sync skipped outside 10:30-19:00 IST work window");
                return true;
            }

            if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "Sync skipped: READ_CALL_LOG permission is not granted");
                return false;
            }

            Log.d(TAG, "Syncing device call logs for official SIM: " + officialSim + " | forceSync=" + forceSync + " | remoteRequest=" + remoteSyncRequested);

            JSONArray logs = fetchLogs(context, officialSim, simLabelsJson);
            boolean success = sendLogs(apiUrl, deviceToken, officialSim, logs);
            if (success) {
                Log.d(TAG, "Successfully synced " + logs.length() + " logs");
                return true;
            } else {
                Log.e(TAG, "Failed to send logs to server");
                return false;
            }
        } catch (Exception e) {
            Log.e(TAG, "Critical error during sync", e);
            return false;
        }
    }

    private static boolean isWithinWorkWindow() {
        Calendar now = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        int minutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        return minutes >= (10 * 60 + 30) && minutes <= (19 * 60);
    }

    private static JSONArray fetchLogs(Context context, String officialSim, String simLabelsJson) {
        JSONArray callLogs = new JSONArray();
        try {
            JSONObject simLabels = new JSONObject(simLabelsJson);
            
            Cursor cursor = context.getContentResolver().query(
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
                Map<String, Integer> labelFrequencyMap = new HashMap<>();
                Map<String, String> numberToSlotMap = new HashMap<>();
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP_MR1) {
                    SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
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
                                Set<String> seenKeys = new HashSet<>();
                                registerLabelSlotMapping(carrier, slot, labelToSlotMap, labelFrequencyMap, seenKeys);
                                registerLabelSlotMapping(display, slot, labelToSlotMap, labelFrequencyMap, seenKeys);
                            }
                        }
                    }
                }

                int count = 0;
                int limit = 200; // Limit per sync burst

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

                    boolean matches = officialSim.equals("0");
                    if (!matches) {
                        String officialLabel = null;
                        if (simLabels.has(officialSim)) {
                            officialLabel = simLabels.optString(officialSim, "").trim().toLowerCase();
                        }
                        String currentLabel = (simLabel != null) ? simLabel.trim().toLowerCase() : "";
                        
                        if (officialLabel != null && !officialLabel.isEmpty() && !currentLabel.isEmpty() && !currentLabel.equals("unknown") && !currentLabel.equals("null")) {
                            matches = currentLabel.equals(officialLabel);
                        } else {
                            matches = simSlot.equals(officialSim);
                        }
                    }

                    if (matches) {
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

                        callLogs.put(log);
                        count++;
                    }
                }
                Log.d(TAG, "Collected " + count + " call logs for officialSim=" + officialSim);
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error fetching logs", e);
        }
        return callLogs;
    }

    private static String getCallType(int type) {
        switch (type) {
            case CallLog.Calls.INCOMING_TYPE: return "INCOMING";
            case CallLog.Calls.OUTGOING_TYPE: return "OUTGOING";
            case CallLog.Calls.MISSED_TYPE: return "MISSED";
            case CallLog.Calls.REJECTED_TYPE: return "REJECTED";
            default: return "OTHER";
        }
    }

    private static boolean sendLogs(String baseUrl, String deviceToken, String officialSim, JSONArray logs) {
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

    private static boolean hasPendingRemoteSyncRequest(String baseUrl, String deviceToken) {
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
