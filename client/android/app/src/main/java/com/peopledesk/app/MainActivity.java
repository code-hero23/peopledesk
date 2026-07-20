package com.peopledesk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallLogPlugin.class);
        super.onCreate(savedInstanceState);
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
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        );
    }
}
