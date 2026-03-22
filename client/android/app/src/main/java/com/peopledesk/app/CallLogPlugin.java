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
        JSObject ret = new JSObject();
        JSArray simList = new JSArray();

        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP_MR1) {
                SubscriptionManager subscriptionManager = (SubscriptionManager) getContext().getSystemService(android.content.Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                if (subscriptionManager != null) {
                    List<SubscriptionInfo> activeSubscriptionInfoList = subscriptionManager.getActiveSubscriptionInfoList();

                    if (activeSubscriptionInfoList != null) {
                        for (SubscriptionInfo si : activeSubscriptionInfoList) {
                            JSObject sim = new JSObject();
                            sim.put("simId", String.valueOf(si.getSubscriptionId()));
                            sim.put("simSlot", String.valueOf(si.getSimSlotIndex() + 1)); // 1-based for users
                            sim.put("simLabel", si.getCarrierName().toString());
                            sim.put("displayName", si.getDisplayName().toString());
                            // Try to get phone number if available (often requires extra perms or not set)
                            String number = "";
                            try {
                                number = si.getNumber();
                            } catch (Exception e) {}
                            sim.put("number", number != null ? number : "");
                            simList.put(sim);
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e("CallLogPlugin", "Error getting SIM info", e);
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

                while (cursor.moveToNext() && count < limit) {
                    JSObject log = new JSObject();
                    log.put("number", cursor.getString(numberIndex));
                    log.put("name", cursor.getString(nameIndex)); // Contact name if exists
                    
                    // Safe access for simId and simLabel
                    String simId = null;
                    if (simIdIndex != -1) {
                         simId = cursor.getString(simIdIndex);
                    }
                    log.put("simId", simId); // For SIM selection
                    
                    String simLabel = null;
                    if (simLabelIndex != -1) {
                        simLabel = cursor.getString(simLabelIndex);
                    }
                    log.put("simLabel", simLabel); // Carrier/Provider Name
                    
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
