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
import java.util.List;

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_CALL_LOG, Manifest.permission.READ_PHONE_STATE }, alias = "callLog")
    }
)
public class CallLogPlugin extends Plugin {

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
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP_MR1) {
                    SubscriptionManager sm = (SubscriptionManager) getContext().getSystemService(android.content.Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null) {
                        java.util.List<SubscriptionInfo> activeList = sm.getActiveSubscriptionInfoList();
                        if (activeList != null) {
                            for (SubscriptionInfo si : activeList) {
                                String id = String.valueOf(si.getSubscriptionId());
                                String carrier = si.getCarrierName() != null ? si.getCarrierName().toString() : si.getDisplayName().toString();
                                labelMap.put(id, carrier);
                                slotMap.put(id, String.valueOf(si.getSimSlotIndex() + 1));
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

                    // OVERRIDE with real-time info if available
                    if (simId != null && labelMap.containsKey(simId)) {
                        simLabel = labelMap.get(simId);
                        simSlot = slotMap.get(simId);
                    } else if (simId != null && simId.length() <= 2) {
                        // If simId is already a slot number (0 or 1), try to match
                        simSlot = String.valueOf(Integer.parseInt(simId) + 1);
                        if (labelMap.containsValue(simSlot)) {
                           // reverse lookup or just keep simLabel
                        }
                    }
                    
                    log.put("simLabel", simLabel != null ? simLabel : "Unknown");
                    log.put("simSlot", simSlot);
                    
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
}
