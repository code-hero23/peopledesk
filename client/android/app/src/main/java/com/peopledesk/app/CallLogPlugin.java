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

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_CALL_LOG }, alias = "callLog")
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

                int limit = 500; // Increased limit for automated sync
                int count = 0;

                while (cursor.moveToNext() && count < limit) {
                    JSObject log = new JSObject();
                    log.put("number", cursor.getString(numberIndex));
                    log.put("name", cursor.getString(nameIndex)); // Contact name if exists
                    log.put("simId", cursor.getString(simIdIndex)); // For SIM selection
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
