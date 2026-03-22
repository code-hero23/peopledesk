package com.peopledesk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallLogPlugin.class);
        super.onCreate(savedInstanceState);
        scheduleBackgroundSync();
    }

    private void scheduleBackgroundSync() {
        PeriodicWorkRequest syncRequest = new PeriodicWorkRequest.Builder(
            CallLogSyncWorker.class,
            15, // Minimum allowed interval is 15 minutes
            TimeUnit.MINUTES
        ).build();

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "CallLogSync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        );
    }
}
