package com.peopledesk.app;

import android.os.Bundle;
import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.BridgeActivity;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_NAME = "CapacitorStorage";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallLogPlugin.class);
        super.onCreate(savedInstanceState);
        ensureCallSyncScheduling();
    }

    @Override
    public void onResume() {
        super.onResume();
        ensureCallSyncScheduling();
    }

    private boolean isCallSyncActivated() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString("call_sync_device_token", null) != null
            && prefs.getString("cre_official_sim", null) != null
            && prefs.getString("apiUrl", null) != null;
    }

    private void ensureCallSyncScheduling() {
        if (!isCallSyncActivated()) {
            return;
        }
        scheduleBackgroundSync();
        CallSyncAlarmReceiver.schedule(this);
    }

    private void scheduleBackgroundSync() {
        PeriodicWorkRequest syncRequest = new PeriodicWorkRequest.Builder(
            CallLogSyncWorker.class,
            30,
            TimeUnit.MINUTES
        ).setConstraints(new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()).build();

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "CallLogSync",
            ExistingPeriodicWorkPolicy.REPLACE,
            syncRequest
        );
    }
}
