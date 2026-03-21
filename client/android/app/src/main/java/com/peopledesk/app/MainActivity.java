package com.peopledesk.app;

import android.os.Bundle;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallLogPlugin.class);
        super.onCreate(savedInstanceState);
        scheduleBackgroundSync();
    }

    private void scheduleBackgroundSync() {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest syncRequest = new PeriodicWorkRequest.Builder(
                CallLogSyncWorker.class,
                24, TimeUnit.HOURS // Once per day
        )
                .setConstraints(constraints)
                .addTag("CallLogSync")
                .build();

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "CallLogSync",
                ExistingPeriodicWorkPolicy.KEEP, // Keep existing if already scheduled
                syncRequest
        );
    }
}
