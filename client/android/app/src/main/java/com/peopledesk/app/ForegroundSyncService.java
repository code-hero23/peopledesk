package com.peopledesk.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class ForegroundSyncService extends Service {
    private static final String TAG = "ForegroundSyncService";
    public static final String CHANNEL_ID = "PeopleDeskCallSyncChannel";
    public static final int NOTIFICATION_ID = 2001;
    private static final long POLL_INTERVAL_MS = 60000;

    private Handler handler;
    private Runnable pollRunnable;

    public static void startService(Context context) {
        try {
            Intent intent = new Intent(context, ForegroundSyncService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting ForegroundSyncService", e);
        }
    }

    public static void stopService(Context context) {
        try {
            Intent intent = new Intent(context, ForegroundSyncService.class);
            context.stopService(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping ForegroundSyncService", e);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        handler = new Handler(Looper.getMainLooper());
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                triggerSyncWorker();
                if (handler != null) {
                    handler.postDelayed(this, POLL_INTERVAL_MS);
                }
            }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = createNotification();
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to startForeground", e);
        }

        if (handler != null && pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
            handler.post(pollRunnable);
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (handler != null && pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
        }
        super.onDestroy();
    }

    private void triggerSyncWorker() {
        try {
            androidx.work.OneTimeWorkRequest request = new androidx.work.OneTimeWorkRequest.Builder(CallLogSyncWorker.class)
                .setConstraints(new androidx.work.Constraints.Builder()
                    .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                    .build())
                .build();
            androidx.work.WorkManager.getInstance(getApplicationContext()).enqueue(request);
        } catch (Exception e) {
            Log.e(TAG, "Failed to trigger sync worker from service", e);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "PeopleDesk Call Sync Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Ensures automatic call log syncing operates in the background");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PeopleDesk Auto Call Sync")
            .setContentText("Background call log synchronization active")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true);
        return builder.build();
    }
}
