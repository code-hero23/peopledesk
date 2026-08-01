package com.peopledesk.app;

import android.Manifest;
import android.database.Cursor;
import android.provider.CallLog;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Log;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.app.AlarmManager;
import androidx.work.*;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_CALL_LOG, Manifest.permission.READ_PHONE_STATE }, alias = "callLog")
    }
)
public class CallLogPlugin extends Plugin {
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

    private void registerLabelSlotMapping(String label, String slot, java.util.Map<String, String> labelToSlotMap, java.util.Map<String, Integer> labelFrequencyMap, Set<String> seenKeys) {
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

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            String packageName = getContext().getPackageName();
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:" + packageName));
                getActivity().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            AlarmManager alarms = (AlarmManager) getContext().getSystemService(android.content.Context.ALARM_SERVICE);
            if (alarms != null && !alarms.canScheduleExactAlarms()) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void echo(PluginCall call) {
        String value = call.getString("value");
        JSObject ret = new JSObject();
        ret.put("value", value);
        call.resolve(ret);
    }

    @PluginMethod
    public void getCallLogs(PluginCall call) {
        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            requestPermissionForAlias("callLog", call, "callLogCallback");
        } else {
            fetchCallLogs(call);
        }
    }

    @PluginMethod
    public void getSimInfo(PluginCall call) {
        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            requestPermissionForAlias("callLog", call, "simInfoCallback");
            return;
        }
        fetchSimInfo(call);
    }

    @PermissionCallback
    private void simInfoCallback(PluginCall call) {
        if (getPermissionState("callLog") == PermissionState.GRANTED) {
            fetchSimInfo(call);
        } else {
            call.reject("Permission required for SIM info");
        }
    }

    private void fetchSimInfo(PluginCall call) {
        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            Log.w("CallLogPlugin", "getSimInfo called without permissions");
            call.reject("PERMISSION_DENIED");
            return;
        }
        
        JSObject ret = new JSObject();
        JSArray simList = new JSArray();

        try {
            Log.d("CallLogPlugin", "Fetching SIM info...");
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP_MR1) {
                SubscriptionManager subscriptionManager = (SubscriptionManager) getContext().getSystemService(android.content.Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                if (subscriptionManager != null) {
                    List<SubscriptionInfo> activeSubscriptionInfoList = subscriptionManager.getActiveSubscriptionInfoList();
                    Log.d("CallLogPlugin", "Active subscriptions found in system: " + (activeSubscriptionInfoList != null ? activeSubscriptionInfoList.size() : 0));

                    if (activeSubscriptionInfoList != null) {
                        for (SubscriptionInfo si : activeSubscriptionInfoList) {
                            JSObject sim = new JSObject();
                            sim.put("simId", String.valueOf(si.getSubscriptionId()));
                            int slotIndex = si.getSimSlotIndex();
                            sim.put("simSlot", String.valueOf(slotIndex + 1));
                            
                            // Important: CarrierName vs DisplayName vs Number
                            String carrier = si.getCarrierName() != null ? si.getCarrierName().toString() : "";
                            String display = si.getDisplayName() != null ? si.getDisplayName().toString() : "";
                            
                            Log.d("CallLogPlugin", "Discovery [Slot " + (slotIndex+1) + "] -> SubId: " + si.getSubscriptionId() + " | Carrier: " + carrier + " | Display: " + display);
                            
                            sim.put("simLabel", carrier);
                            sim.put("displayName", display);
                            
                            String number = "";
                            try {
                                number = si.getNumber();
                            } catch (Exception e) {}
                            sim.put("number", number != null ? number : "");
                            try {
                                String iccId = si.getIccId();
                                sim.put("iccId", iccId != null ? iccId : "");
                            } catch (Exception e) {
                                sim.put("iccId", "");
                            }
                            
                            simList.put(sim);
                        }
                    } else {
                        Log.e("CallLogPlugin", "Active subscription list is NULL");
                    }
                } else {
                    Log.e("CallLogPlugin", "SubscriptionManager is NULL");
                }
            } else {
                Log.w("CallLogPlugin", "SDK level too low for SubscriptionManager");
            }
        } catch (Exception e) {
            Log.e("CallLogPlugin", "Critical Error getting SIM info", e);
        }

        ret.put("sims", simList);
        call.resolve(ret);
    }

    @PermissionCallback
    private void callLogCallback(PluginCall call) {
        if (getPermissionState("callLog") == PermissionState.GRANTED) {
            fetchCallLogs(call);
        } else {
            call.reject("Permission is required to read call logs");
        }
    }

    private void fetchCallLogs(PluginCall call) {
        JSArray callLogs = new JSArray();
        try {
            Cursor cursor = getContext().getContentResolver().query(
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
                int simLabelIndex = cursor.getColumnIndex("phone_account_label"); // Available since API 21, but column name is string literal to be safe

                int limit = 500; // Increased limit for automated sync
                int count = 0;

                // PRE-FETCH active SIMs to match labels precisely
                java.util.Map<String, String> labelMap = new java.util.HashMap<>();
                java.util.Map<String, String> slotMap = new java.util.HashMap<>();
                java.util.Map<String, String> labelToSlotMap = new java.util.HashMap<>();
                java.util.Map<String, Integer> labelFrequencyMap = new java.util.HashMap<>();
                java.util.Map<String, String> numberToSlotMap = new java.util.HashMap<>();
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP_MR1) {
                    SubscriptionManager sm = (SubscriptionManager) getContext().getSystemService(android.content.Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null) {
                        java.util.List<SubscriptionInfo> activeList = sm.getActiveSubscriptionInfoList();
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

                while (cursor.moveToNext() && count < limit) {
                    JSObject log = new JSObject();
                    log.put("number", cursor.getString(numberIndex));
                    log.put("name", cursor.getString(nameIndex)); 
                    
                    String simId = simIdIndex != -1 ? cursor.getString(simIdIndex) : null;
                    log.put("simId", simId);
                    
                    String simLabel = simLabelIndex != -1 ? cursor.getString(simLabelIndex) : null;
                    String simSlot = "0";
                    String subscriptionId = getOptionalColumn(cursor, "subscription_id");
                    String legacySimId = getOptionalColumn(cursor, "simid");
                    String accountAddress = getOptionalColumn(cursor, "phone_account_address");
                    String phoneAccountId = getOptionalColumn(cursor, "phone_account_id");
                    String normalizedAccountAddress = normalizePhoneNumber(accountAddress);

                    // OVERRIDE with real-time info if available
                    if (simId != null && labelMap.containsKey(simId)) {
                        simLabel = labelMap.get(simId);
                        simSlot = slotMap.get(simId);
                    } else if (subscriptionId != null && slotMap.containsKey(subscriptionId)) {
                        simLabel = labelMap.get(subscriptionId);
                        simSlot = slotMap.get(subscriptionId);
                    } else if (legacySimId != null && slotMap.containsKey(legacySimId)) {
                        simLabel = labelMap.get(legacySimId);
                        simSlot = slotMap.get(legacySimId);
                    } else if (!normalizedAccountAddress.isEmpty() && numberToSlotMap.containsKey(normalizedAccountAddress)) {
                        simSlot = numberToSlotMap.get(normalizedAccountAddress);
                    } else if (simLabel != null && labelToSlotMap.containsKey(simLabel.trim().toLowerCase())) {
                        simSlot = labelToSlotMap.get(simLabel.trim().toLowerCase());
                    } else if (simId != null && simId.matches("\\d{1,2}")) {
                        int parsedSimId = Integer.parseInt(simId);
                        if (parsedSimId >= 1 && parsedSimId <= 2) {
                            // Some devices already expose the human-readable slot number directly.
                            simSlot = String.valueOf(parsedSimId);
                        } else if (parsedSimId >= 0 && parsedSimId <= 1) {
                            // Other devices expose zero-based slots (0/1).
                            simSlot = String.valueOf(parsedSimId + 1);
                        }
                    }

                    simSlot = normalizeSimSlotValue(simSlot, simId);
                    
                    log.put("simLabel", simLabel != null ? simLabel : "Unknown");
                    log.put("simSlot", simSlot);
                    log.put("subscriptionId", subscriptionId != null ? subscriptionId : "");
                    log.put("legacySimId", legacySimId != null ? legacySimId : "");
                    log.put("phoneAccountAddress", accountAddress != null ? accountAddress : "");
                    log.put("phoneAccountId", phoneAccountId != null ? phoneAccountId : "");
                    
                    log.put("type", getCallType(cursor.getInt(typeIndex)));
                    log.put("date", cursor.getLong(dateIndex));
                    log.put("duration", cursor.getInt(durationIndex));
                    callLogs.put(log);
                    count++;
                }
                cursor.close();
            }
            
            JSObject ret = new JSObject();
            ret.put("logs", callLogs);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error fetching call logs: " + e.getMessage());
        }
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

    @PluginMethod
    public void scheduleCallLogSync(PluginCall call) {
        try {
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

            PeriodicWorkRequest syncRequest = new PeriodicWorkRequest.Builder(
                CallLogSyncWorker.class,
                30, TimeUnit.MINUTES
            ).setConstraints(constraints).build();

            WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(
                "CallLogSync",
                ExistingPeriodicWorkPolicy.REPLACE,
                syncRequest
            );
            CallSyncAlarmReceiver.schedule(getContext());

            Log.d("CallLogPlugin", "Background sync scheduled (REPLACE policy)");
            if (call != null) call.resolve();
        } catch (Exception e) {
            Log.e("CallLogPlugin", "Failed to schedule sync", e);
            if (call != null) call.reject(e.getMessage());
        }
    }
}
