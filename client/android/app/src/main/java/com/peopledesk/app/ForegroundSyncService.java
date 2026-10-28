package com.peopledesk.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.ContentObserver;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.CallLog;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class ForegroundSyncService extends Service {
    private static final String TAG = "ForegroundSyncService";
    public static final String CHANNEL_ID = "PeopleDeskCallSyncChannel";
    public static final int NOTIFICATION_ID = 2001;
    private static final long POLL_INTERVAL_MS = 60000L;
    private static final long CALL_OBSERVER_DEBOUNCE_MS = 3500L;

    private Handler handler;
    private Runnable pollRunnable;
    private Runnable callChangeRunnable;
    private ContentObserver callLogObserver;
    private boolean observerRegistered = false;

    public static void startService(Context context) {
        try {
            Intent intent = new Intent(context, ForegroundSyncService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not start ForegroundSyncService from current state, enqueuing WorkManager fallback", e);
            CallSyncAlarmReceiver.enqueueImmediateSyncWork(context, true, 0);
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
        callChangeRunnable = () -> {
            Log.d(TAG, "CallLog ContentObserver triggered immediate sync");
            triggerSyncWorker();
        };
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                registerCallLogObserverIfNeeded();
                triggerSyncWorker();
                if (handler != null) {
                    handler.postDelayed(this, POLL_INTERVAL_MS);
                }
            }
        };
        registerCallLogObserverIfNeeded();
    }

    private void registerCallLogObserverIfNeeded() {
        if (observerRegistered) return;
        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                callLogObserver = new ContentObserver(handler) {
                    @Override
                    public void onChange(boolean selfChange) {
                        super.onChange(selfChange);
                        if (handler != null && callChangeRunnable != null) {
                            handler.removeCallbacks(callChangeRunnable);
                            handler.postDelayed(callChangeRunnable, CALL_OBSERVER_DEBOUNCE_MS);
                        }
                    }
                };
                getContentResolver().registerContentObserver(CallLog.Calls.CONTENT_URI, true, callLogObserver);
                observerRegistered = true;
                Log.d(TAG, "Registered real-time CallLog ContentObserver");
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to register CallLog ContentObserver", e);
        }
    }

    private void unregisterCallLogObserver() {
        if (observerRegistered && callLogObserver != null) {
            try {
                getContentResolver().unregisterContentObserver(callLogObserver);
            } catch (Exception ignored) {}
            observerRegistered = false;
        }
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

        registerCallLogObserverIfNeeded();

        if (handler != null && pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
            handler.post(pollRunnable);
        }

        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.w(TAG, "App task removed from Recents; scheduling immediate alarm & sync revival");
        try {
            Context appContext = getApplicationContext();
            CallSyncAlarmReceiver.scheduleAlarmsOnly(appContext);
            CallSyncAlarmReceiver.schedulePostCallAlarm(appContext, 5000L);
            CallSyncAlarmReceiver.enqueueImmediateSyncWork(appContext, true, 3);
        } catch (Exception e) {
            Log.e(TAG, "Error handling onTaskRemoved", e);
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (handler != null) {
            if (pollRunnable != null) handler.removeCallbacks(pollRunnable);
            if (callChangeRunnable != null) handler.removeCallbacks(callChangeRunnable);
        }
        unregisterCallLogObserver();
        try {
            CallSyncAlarmReceiver.scheduleAlarmsOnly(getApplicationContext());
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    private final java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newSingleThreadExecutor();

    private void triggerSyncWorker() {
        try {
            executor.execute(() -> {
                PowerManager.WakeLock wakeLock = null;
                try {
                    Context appContext = getApplicationContext();
                    PowerManager pm = (PowerManager) appContext.getSystemService(Context.POWER_SERVICE);
                    if (pm != null) {
                        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PeopleDesk:ServiceSyncWakeLock");
                        wakeLock.setReferenceCounted(false);
                        wakeLock.acquire(25000L);
                    }
                    CallSyncAlarmReceiver.scheduleAlarmsOnly(appContext);
                    CallLogSyncWorker.performSync(appContext, true);
                } catch (Exception e) {
                    Log.e(TAG, "Direct sync execution error", e);
                } finally {
                    if (wakeLock != null && wakeLock.isHeld()) {
                        try {
                            wakeLock.release();
                        } catch (Exception ignored) {}
                    }
                }
                try {
                    LocationSyncWorker.performSync(getApplicationContext());
                } catch (Exception e) {
                    Log.e(TAG, "Direct location sync execution error", e);
                }
            });
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
                "PeopleDesk Field & Call Sync Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Ensures continuous call log and live location tracking operates in the background");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PeopleDesk Sync Active")
            .setContentText("Continuous official call sync & tracking active")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true);
        return builder.build();
    }
}
