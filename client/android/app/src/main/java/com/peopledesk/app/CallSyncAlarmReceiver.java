package com.peopledesk.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkManager;
import java.util.Calendar;
import java.util.TimeZone;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class CallSyncAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "CallSyncAlarmReceiver";
    public static final String ACTION_START = "com.peopledesk.app.CALL_SYNC_START";
    public static final String ACTION_TICK = "com.peopledesk.app.CALL_SYNC_TICK";
    public static final String ACTION_FINAL = "com.peopledesk.app.CALL_SYNC_FINAL";
    public static final String ACTION_POST_CALL = "com.peopledesk.app.CALL_SYNC_POST_CALL";
    private static final int REQUEST_START = 1001;
    private static final int REQUEST_TICK = 1002;
    private static final int REQUEST_FINAL = 1003;
    private static final int REQUEST_POST_CALL = 1004;
    private static final int WINDOW_START_MINUTES = 7 * 60; // 07:00 AM IST
    private static final int WINDOW_END_MINUTES = 20 * 60; // 08:00 PM IST

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "Received broadcast action=" + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
            || "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action)
            || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            schedule(context);
            enqueueImmediateSyncWork(context, true, 0);
            return;
        }

        // Instant trigger right after a phone call ends (while CPU & network are still awake)
        if (TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(action)) {
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            Log.d(TAG, "Phone state changed: " + state);
            if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
                schedulePostCallAlarm(context, 4000L);
                enqueueImmediateSyncWork(context, true, 5);
                scheduleNextWindowTick(context);
            }
            return;
        }

        boolean forceSync = ACTION_START.equals(action)
            || ACTION_TICK.equals(action)
            || ACTION_FINAL.equals(action)
            || ACTION_POST_CALL.equals(action);

        enqueueImmediateSyncWork(context, forceSync, 0);

        OneTimeWorkRequest locRequest = new OneTimeWorkRequest.Builder(LocationSyncWorker.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build();
        WorkManager.getInstance(context).enqueue(locRequest);

        // Reschedule daily alarms and next 5-minute tick (never cancels the chain)
        scheduleAlarmsOnly(context);
        ForegroundSyncService.startService(context);

        // Also run direct background sync using goAsync() + WakeLock so OEM JobScheduler throttling cannot block it
        final PendingResult pendingResult = goAsync();
        final Context appContext = context.getApplicationContext();
        Executors.newSingleThreadExecutor().execute(() -> {
            PowerManager.WakeLock wakeLock = null;
            try {
                PowerManager pm = (PowerManager) appContext.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PeopleDesk:AlarmSyncWakeLock");
                    wakeLock.setReferenceCounted(false);
                    wakeLock.acquire(20000L);
                }
                CallLogSyncWorker.performSync(appContext, forceSync);
            } catch (Exception e) {
                Log.e(TAG, "Direct alarm sync execution error", e);
            } finally {
                if (wakeLock != null && wakeLock.isHeld()) {
                    try {
                        wakeLock.release();
                    } catch (Exception ignored) {}
                }
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        });
    }

    public static void enqueueImmediateSyncWork(Context context, boolean forceSync, int delaySeconds) {
        try {
            Data input = new Data.Builder().putBoolean("forceSync", forceSync).build();
            OneTimeWorkRequest.Builder builder = new OneTimeWorkRequest.Builder(CallLogSyncWorker.class)
                .setInputData(input)
                .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build());

            if (delaySeconds > 0) {
                builder.setInitialDelay(delaySeconds, TimeUnit.SECONDS);
            } else {
                try {
                    builder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
                } catch (Exception ignored) {}
            }

            WorkManager.getInstance(context).enqueueUniqueWork(
                delaySeconds > 0 ? "PostCallLogSync" : "ImmediateCallLogSync",
                ExistingWorkPolicy.REPLACE,
                builder.build()
            );
        } catch (Exception e) {
            Log.e(TAG, "Failed to enqueue immediate sync work", e);
        }
    }

    public static void schedule(Context context) {
        scheduleAlarmsOnly(context);
        ForegroundSyncService.startService(context);
    }

    public static void scheduleAlarmsOnly(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        setAlarm(context, alarms, ACTION_START, 7, 0, REQUEST_START);
        setAlarm(context, alarms, ACTION_FINAL, 20, 0, REQUEST_FINAL);
        scheduleNextWindowTick(context);
    }

    public static void schedulePostCallAlarm(Context context, long delayMs) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        long triggerAt = System.currentTimeMillis() + delayMs;
        Intent intent = new Intent(context, CallSyncAlarmReceiver.class).setAction(ACTION_POST_CALL);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            REQUEST_POST_CALL,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        scheduleExactOrAllowIdle(alarms, triggerAt, pending);
    }

    private static void setAlarm(Context context, AlarmManager alarms, String action, int hour, int minute, int requestCode) {
        Calendar when = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        when.set(Calendar.HOUR_OF_DAY, hour);
        when.set(Calendar.MINUTE, minute);
        when.set(Calendar.SECOND, 0);
        when.set(Calendar.MILLISECOND, 0);
        if (when.getTimeInMillis() <= System.currentTimeMillis()) {
            when.add(Calendar.DATE, 1);
        }
        Intent intent = new Intent(context, CallSyncAlarmReceiver.class).setAction(action);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Log.d(TAG, "Scheduling " + action + " for " + when.getTime().toString());
        scheduleExactOrAllowIdle(alarms, when.getTimeInMillis(), pending);
    }

    public static void scheduleNextWindowTick(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;

        Calendar now = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        int minutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        Calendar next = (Calendar) now.clone();
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);

        if (minutes < WINDOW_START_MINUTES) {
            // Before 7:00 AM IST: schedule first tick for 7:02 AM today (never cancel the chain)
            next.set(Calendar.HOUR_OF_DAY, 7);
            next.set(Calendar.MINUTE, 2);
            if (next.getTimeInMillis() <= System.currentTimeMillis()) {
                next.add(Calendar.MINUTE, 5);
            }
        } else if (minutes >= WINDOW_END_MINUTES) {
            // At or after 8:00 PM IST: schedule first tick for 7:02 AM tomorrow as a guaranteed backup to ACTION_START
            next.add(Calendar.DATE, 1);
            next.set(Calendar.HOUR_OF_DAY, 7);
            next.set(Calendar.MINUTE, 2);
        } else {
            // Inside 7:00 AM - 8:00 PM IST window: fire every 5 minutes
            next.add(Calendar.MINUTE, 5);
            int nextMinutes = next.get(Calendar.HOUR_OF_DAY) * 60 + next.get(Calendar.MINUTE);
            if (nextMinutes > WINDOW_END_MINUTES) {
                next.set(Calendar.HOUR_OF_DAY, 20);
                next.set(Calendar.MINUTE, 0);
            }
        }

        Intent intent = new Intent(context, CallSyncAlarmReceiver.class).setAction(ACTION_TICK);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            REQUEST_TICK,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Log.d(TAG, "Scheduling " + ACTION_TICK + " for " + next.getTime().toString());
        scheduleExactOrAllowIdle(alarms, next.getTimeInMillis(), pending);
    }

    private static void scheduleExactOrAllowIdle(AlarmManager alarms, long triggerAtMillis, PendingIntent pending) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarms.canScheduleExactAlarms()) {
                    alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending);
                } else {
                    alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending);
            } else {
                alarms.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "Exact alarm security exception, falling back to inexact idle alarm", se);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending);
            } else {
                alarms.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending);
            }
        }
    }
}
